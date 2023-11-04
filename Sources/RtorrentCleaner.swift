import ArgumentParser
import Foundation
import System
import XmlRpc

struct Torrent: Hashable {
  var infoHash: String
  var dataPath: String
  var custom1: String
  var announce: String
  var message: String

  func hash(into hasher: inout Hasher) {
    hasher.combine(self.infoHash)
  }
}

struct RTorrent {
  var client: XmlRpcClient
  init(_ rpc: String) {
    client = XmlRpc.createClient(rpc)
  }

  func downloadList() throws -> [String] {
    let response = try client.download_list()
    return try! JSONDecoder().decode(
      [String].self, from: response.stringValue.data(using: .utf8)!)
  }

  func getTorrent(_ infoHash: String) throws -> Torrent {
    let dataPath = try client.d.base_path(infoHash).stringValue
    let custom1 = try client.d.custom1(infoHash).stringValue
    let announce = try client.t.url("\(infoHash):t0").stringValue
    let message = try client.d.message(infoHash).stringValue
    return Torrent(
      infoHash: infoHash,
      dataPath: dataPath,
      custom1: custom1,
      announce: announce,
      message: message
    )
  }

  func removeTorrent(_ infoHash: String) throws {
    try client.d.erase(infoHash)
    for i in 0..<5 {
      if try self.downloadList().contains(infoHash) {
        print("Removed \(infoHash)")
        return
      }
      sleep(1 << i)
    }
    print("Removing \(infoHash) failed")
  }
}

@available(macOS 13.0, *)
@main
struct RTorrentCleaner: ParsableCommand {
  @Option(help: "rTorrent RPC url") public var rpc: String
  @Option(help: "Root directories to check") public var dataDirs = [String]()
  @Flag(help: "Remove unregistered torrents") public var unregistered = false
  @Flag(help: "Remove orphaned children") public var orphans = false

  func printProgress(_ i: Int, of total: Int) {
    let ratio = i * 100 / total
    let lastRatio = (i - 1) * 100 / total
    if ratio > lastRatio {
      print("\(ratio)%")
    }
  }

  public func run() throws {
    var session = Set<Torrent>()
    let rtorrent = RTorrent(rpc)
    let downloadList = try rtorrent.downloadList()

    for (i, infoHash) in downloadList.enumerated() {
      printProgress(i, of: downloadList.count)
      let torrent = try rtorrent.getTorrent(infoHash)
      session.insert(torrent)

      if torrent.message.lowercased().contains("unregistered") {
        if unregistered {
          try rtorrent.removeTorrent(infoHash)
          session.remove(torrent)
        } else {
          print("Would remove unregistered torrent:", torrent)
        }
      }
    }
    print("Indexed all torrents")

    let pathsOnDisk = Set<URL>(
      try dataDirs.flatMap { dataDir in
        let dirents = try FileManager.default.contentsOfDirectory(atPath: dataDir)
        return dirents.map { dirent in
          return URL(filePath: dataDir, directoryHint: .checkFileSystem).appendingPathComponent(
            dirent
          )
          .absoluteURL
        }
      })

    let activePaths = Set<URL>(
      session.map({ URL(filePath: $0.dataPath, directoryHint: .checkFileSystem) }))

    let orphans = pathsOnDisk.subtracting(activePaths)

    for orphan in orphans {
      if self.orphans {
        try FileManager.default.removeItem(at: orphan)
      } else {
        print("Would remove orphan:", orphan.path())
      }
    }
  }
}
