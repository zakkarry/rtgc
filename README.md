# rtgc

A mishmash of garbage-collection tasks designed around
large-scale rTorrent installations.
Similar to [qbit_manage](https://github.com/StuffAnThings/qbit_manage)
but for rTorrent.

## features
- remove unregistered torrents
- remove torrents with missing files errors
- remove all the files that Sonarr and Radarr upgraded from and then never deleted
  - also remove torrents referencing those files (optionally)
- find-and-replace symlink targets that have been the victim of `realpath` (this one's pretty specific to my setup)
- remove any files that have no hardlinks, symlinks pointing to them, or optionally, seeding torrents pointing to them. 

No tests, no support. Use at your own risk. 
This tool could delete all your files pretty easily. 

## options
```js
{
  rpc: { type: "string" },
  dataDir: { short: "d", type: "string", multiple: true },
  fixUnregistered: { type: "boolean" },
  fixOrphaned: { type: "boolean" },
  symlinkSource: { type: "string", multiple: true },
  improperSymlinkSegment: { type: "string" },
  properSymlinkSegment: { type: "string" },
  fixSymlinks: { type: "boolean" },
  retainSolelyForSeeding: { type: "boolean" },
  fixMissingFiles: { type: "boolean" },
  safetyThreshold: { type: "string", default: "1" },
  force: { type: "boolean" },
}
```
