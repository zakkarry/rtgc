import { Text, Button } from "@chakra-ui/react";
import { filesize } from "filesize";
import {
  DialogRoot,
  DialogBackdrop,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from "../ui/dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "../utils/trpc";
import { OrphanedPath } from "../../server/types";
import { ProblemTorrent } from "../../server/types";

type DeleteDialogProps = {
  filteredResults: OrphanedPath[] | ProblemTorrent[];
  onClose: () => void;
};

export function DeleteDialog({ filteredResults, onClose }: DeleteDialogProps) {
  const queryClient = useQueryClient();

  const deleteTorrentsMutation = useMutation(
    trpc.torrents.deleteTorrents.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.torrents.scanTorrents.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.torrents.classifyTorrents.queryKey(),
        });
        onClose();
      },
    })
  );

  const deleteOrphansMutation = useMutation(
    trpc.paths.deleteOrphans.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.paths.scanForOrphans.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.torrents.scanTorrents.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.torrents.classifyTorrents.queryKey(),
        });
        onClose();
      },
    })
  );

  const handleConfirmCleanup = () => {
    if (filteredResults[0].type === "orphaned") {
      deleteOrphansMutation.mutate({
        orphanedPaths: filteredResults as OrphanedPath[],
      });
    } else {
      deleteTorrentsMutation.mutate({
        infoHashes: filteredResults.map(
          (p) => (p as ProblemTorrent).torrentInfo.infoHash
        ),
      });
    }
  };

  const selectedSize = filteredResults.reduce((acc, p) => acc + p.size, 0);
  const error = deleteTorrentsMutation.error || deleteOrphansMutation.error;
  return (
    <DialogRoot open={true} onOpenChange={onClose}>
      <DialogBackdrop />
      <DialogContent>
        <DialogHeader>Confirm Cleanup</DialogHeader>
        <DialogBody>
          <Text>
            Are you sure you want to delete {filteredResults.length} paths (
            {filesize(selectedSize)})? This action cannot be undone.
          </Text>
          {error && <Text color="red">{error.message}</Text>}
        </DialogBody>
        <DialogFooter gap={2}>
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button colorScheme="danger" onClick={handleConfirmCleanup}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}
