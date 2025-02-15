import du from "du";
import { filesize } from "filesize";
import { symlinkSync, unlinkSync } from "node:fs";
import { readdir, readlink, rm, stat } from "node:fs/promises";
import { dirname, join, normalize, relative, resolve, sep } from "node:path";
import { parseArgs } from "node:util";
import xmlrpc from "xmlrpc";

function method(methodName, params = []) {
	return { methodName, params };
}

class RTorrent {
	constructor(rpc) {
		const url = new URL(rpc);
		const clientCreator =
			url.protocol === "https:"
				? xmlrpc.createSecureClient
				: xmlrpc.createClient;
		this.client = clientCreator({
			url: url.origin + url.pathname,
			basic_auth: { user: url.username, pass: url.password },
		});
	}

	#call(method, ...params) {
		return new Promise((resolve, reject) => {
			this.client.methodCall(method, params, (err, data) => {
				if (err) return reject(err);
				return resolve(data);
			});
		});
	}

	downloadList() {
		return this.#call("download_list");
	}

	async getTorrent(infoHash) {
		const response = await this.#call("system.multicall", [
			method("d.directory", [infoHash]),
			method("d.message", [infoHash]),
			method("d.is_multi_file", [infoHash]),
			method("d.name", [infoHash]),
			method("t.url", [`${infoHash}:t0`]),
			method("d.custom1", [infoHash]),
		]);

		const [
			[directory],
			[message],
			[isMultiFile],
			[name],
			[announce],
			[custom1],
		] = response;

		return {
			infoHash,
			name,
			tracker: new URL(announce).hostname,
			directory: isMultiFile === "1" ? dirname(directory) : directory,
			basePath: isMultiFile === "1" ? directory : join(directory, name),
			custom1,
			message,
		};
	}

	async removeTorrent(infoHash) {
		await this.#call("d.erase", infoHash);

		for (let i = 0; i < 5; i++) {
			if (!(await this.downloadList()).includes(infoHash)) return;
			await new Promise((r) => void setTimeout(r, 100 * Math.pow(2, i)));
		}
		throw new Error("Failed to remove torrent");
	}
}

function printProgress(i, total) {
	const ratio = Math.floor((i * 100) / total);
	const lastRatio = Math.floor(((i - 1) * 100) / total);
	if (ratio > lastRatio) {
		console.log(`${ratio}%`);
	}
}

async function getChildPaths(dataDir) {
	const entries = await readdir(dataDir);
	return entries.map((entry) => join(dataDir, entry));
}

async function isDirOrDirSymlink(dirent, child) {
	if (dirent.isDirectory()) return true;
	if (dirent.isSymbolicLink()) {
		try {
			const stats = await stat(child);
			return stats.isDirectory();
		} catch (e) {
			return false;
		}
	}
}

async function getSymbolicLinksRecursive(dir) {
	const dirents = await readdir(dir, { withFileTypes: true });
	const children = await Promise.all(
		dirents.map(async (dirent) => {
			const child = join(dir, dirent.name);
			if (await isDirOrDirSymlink(dirent, child)) {
				return getSymbolicLinksRecursive(child);
			} else if (dirent.isSymbolicLink()) {
				return [child];
			} else {
				return [];
			}
		}),
	);
	return children.flat();
}

async function getHardlinkedFilesRecursive(dir) {
	const dirents = await readdir(dir, { withFileTypes: true });
	const children = await Promise.all(
		dirents.map(async (dirent) => {
			const child = join(dir, dirent.name);
			if (await isDirOrDirSymlink(dirent, child)) {
				return getHardlinkedFilesRecursive(child);
			} else if ((await stat(child)).nlink > 1) {
				return [child];
			} else {
				return [];
			}
		}),
	);
	return children.flat();
}

function editSymlink(path, target) {
	unlinkSync(path);
	symlinkSync(target, path);
}

async function fixSymlinks(
	symlinkSourceRoots,
	improperSymlinkSegment,
	properSymlinkSegment,
	fixSymlinks,
) {
	if (improperSymlinkSegment && properSymlinkSegment) {
		const symlinks = (
			await Promise.all(symlinkSourceRoots.map(getSymbolicLinksRecursive))
		).flat();
		for (const symlink of symlinks) {
			const rawLinkTarget = await readlink(symlink);

			if (rawLinkTarget.includes(improperSymlinkSegment)) {
				const properLinkTarget = relative(
					dirname(symlink),
					rawLinkTarget.replace(
						improperSymlinkSegment,
						properSymlinkSegment,
					),
				);

				if (fixSymlinks) {
					console.log(
						`Fixing improper symlink:\n\t${rawLinkTarget}\n\t${properLinkTarget}`,
					);
					editSymlink(symlink, properLinkTarget);
				} else {
					console.log(
						`Would fix improper symlink:\n\t${symlink}\n\t${rawLinkTarget}\n\t${properLinkTarget}`,
					);
				}
			}
		}
	}
}

function getDedupedBasePathsFromFiles(files, dataDirs) {
	return files.reduce((acc, filePath) => {
		const dataDir = dataDirs.find((d) =>
			normalize(filePath).startsWith(resolve(d)),
		);
		if (dataDir) {
			acc.add(
				filePath
					.split(sep)
					.slice(0, dataDir.split(sep).length + 1)
					.join(sep),
			);
		} else {
			console.log("Skipping escaping symlink:", filePath);
		}
		return acc;
	}, new Set());
}

async function findSymlinkTargetPaths(dataDirs, symlinkSourceRoots) {
	const symlinks = (
		await Promise.all(symlinkSourceRoots.map(getSymbolicLinksRecursive))
	).flat();

	const realPaths = (
		await Promise.all(
			symlinks.map(async (symlinkPath) => {
				try {
					const linkTarget = await readlink(symlinkPath);
					return [resolve(dirname(symlinkPath), linkTarget)];
				} catch (e) {
					console.error("skipping broken link:", symlinkPath);
					return [];
				}
			}),
		)
	).flat();

	return getDedupedBasePathsFromFiles(realPaths, dataDirs);
}

async function findHardlinkTargetPaths(dataDirs) {
	const allHardlinks = (
		await Promise.all(dataDirs.map(getHardlinkedFilesRecursive))
	).flat();
	return getDedupedBasePathsFromFiles(allHardlinks, dataDirs);
}

function isUnregistered(torrent) {
	const message = torrent.message.toLowerCase();
	const keywords = [
		"unregistered",
		"not registered",
		"this torrent does not exist",
		"trumped",
		"infohash not found",
		"complete season uploaded",
		"torrent not found",
		"nuked",
		"dupe",
		"see: ",
		"has been deleted",
	].map((e) => e.toLowerCase()); // just to be safe

	return keywords.some((keyword) => message.includes(keyword));
}

async function main() {
	const { values: Args } = parseArgs({
		options: {
			rpc: { type: "string" },
			dataDir: { short: "d", type: "string", multiple: true },
			fixUnregistered: { type: "boolean" },
			fixOrphaned: { type: "boolean" },
			symlinkSource: { type: "string", multiple: true, default: [] },
			improperSymlinkSegment: { type: "string" },
			properSymlinkSegment: { type: "string" },
			fixSymlinks: { type: "boolean" },
			retainSolelyForSeeding: { type: "boolean" },
			fixMissingFiles: { type: "boolean" },
			safetyThreshold: { type: "string", default: "1" },
			force: { type: "boolean" },
		},
	});

	const rtorrent = new RTorrent(Args.rpc);
	const downloadList = await rtorrent.downloadList();

	const session = [];
	if (
		Args.retainSolelyForSeeding ||
		Args.fixUnregistered ||
		Args.fixMissingFiles
	) {
		for (const [i, infoHash] of downloadList.entries()) {
			printProgress(i, downloadList.length);
			const torrent = await rtorrent.getTorrent(infoHash);

			if (isUnregistered(torrent)) {
				if (Args.fixUnregistered) {
					await rtorrent.removeTorrent(infoHash);
					console.log("Removed unregistered torrent:", torrent);
				} else {
					console.log("Would remove unregistered torrent:", torrent);
				}
			} else if (
				torrent.message.trim() ===
				"Download registered as completed, but hash check returned unfinished chunks."
			) {
				if (Args.fixMissingFiles) {
					await rtorrent.removeTorrent(infoHash);
					console.log("Removed missing files torrent:", torrent);
				} else {
					console.log("Would remove missing files torrent:", torrent);
				}
			} else {
				session.push(torrent);
			}
		}
	}

	const allPaths = (
		await Promise.all(Args.dataDir.map(getChildPaths))
	).flat();

	const pathsInSession = new Set(session.map((e) => e.basePath));

	await fixSymlinks(
		Args.symlinkSource,
		Args.improperSymlinkSegment,
		Args.properSymlinkSegment,
		Args.fixSymlinks,
	);

	const pathsHoldingSymlinkTargets = await findSymlinkTargetPaths(
		Args.dataDir,
		Args.symlinkSource,
	);

	const pathsHoldingHardlinkTargets = await findHardlinkTargetPaths(
		Args.dataDir,
	);

	const orphanedPaths = allPaths.filter(
		(path) =>
			!(
				// any of these can create a 'hold' on a path
				(
					(Args.retainSolelyForSeeding && pathsInSession.has(path)) ||
					pathsHoldingSymlinkTargets.has(path) ||
					pathsHoldingHardlinkTargets.has(path)
				)
			),
	);

	if (
		Args.fixOrphaned &&
		!Args.force &&
		(orphanedPaths.length / allPaths.length) * 100 >
			Number(Args.safetyThreshold)
	) {
		const threshold = Number(Args.safetyThreshold);
		console.error(orphanedPaths);
		throw new Error(
			`Orphans to delete (${
				orphanedPaths.length
			}) exceeded ${threshold}% of total (${allPaths.length}).
To execute, rerun with --force --safetyThreshold ${Math.ceil(
				(orphanedPaths.length / allPaths.length) * 100,
			)}.`,
		);
	}

	let totalSize = 0;
	for (const orphan of orphanedPaths) {
		const size = await du(orphan);
		totalSize += size;
		if (Args.fixOrphaned) {
			await rm(orphan, { recursive: true });
			console.log("Removed orphan", filesize(size), orphan);
		} else {
			console.log("Would remove orphan", filesize(size), orphan);
		}
		for (const torrent of session.filter((t) => t.basePath === orphan)) {
			if (Args.fixOrphaned) {
				await rtorrent.removeTorrent(torrent.infoHash);
				console.log("\tRemoved dangling torrent", torrent);
			} else {
				console.log("\tWould remove dangling torrent", torrent);
			}
		}
	}

	console.log(
		`Found ${orphanedPaths.length} orphaned paths totaling ${filesize(
			totalSize,
		)}`,
	);
}

await main();
