import ArgumentParser
import Foundation
import XmlRpc

struct Torrent {
  var infoHash: String
  var dataPath: String
  var custom1: String
  var announce: String
  var message: String
}

struct RTorrent {
  var client: XmlRpcClient
  init(_ rpc: String) {
    client = XmlRpc.createClient(rpc)
  }
  
  func downloadList() throws ->[String] {
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
        return;
      }
      sleep(1 << i)
    }
    print("Removing \(infoHash) failed")
  }
}

@main
struct RTorrentCleaner: ParsableCommand {
  @Option(help: "rTorrent RPC url") public var rpc: String
  @Option(help: "Root directories to check") public var dataDirs: [String]
  @Option(help: "Remove unregistered torrents") public var unregistered: Bool
  @Option(help: "Remove orphaned children") public var orphans: Bool

  public func run() throws {
    var session = [Torrent]()
let rtorrent =     RTorrent(rpc)
    let downloadList = try rtorrent.downloadList()
    
    for (i, infoHash) in downloadList.enumerated() {
      print(i)
      let torrent = try rtorrent.getTorrent(infoHash)
      session.append(torrent)

      if torrent.message.lowercased().contains("unregistered") {
        if unregistered {
          removeUnregisteredTorrent();
			print(
        } else {
          print("Would remove unregistered torrent:", torrent)
        }
      }
    }
  }
}
