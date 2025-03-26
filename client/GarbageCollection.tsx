import { Box, Button, Flex, Text } from "@chakra-ui/react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQueries,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type {
  OrphanedPath,
  ProblemTorrent,
  ProblemType,
} from "../server/types";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { GarbageSummary } from "./components/GarbageSummary";
import { ProblemPathsTable } from "./components/ProblemPathsTable";
import { TypeFilter } from "./components/TypeFilter";
import { trpc } from "./utils/trpc";

export function GarbageCollection() {
  const queryClient = useQueryClient();
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedType, setSelectedType] = useState<ProblemType | "orphaned">(
    "unregistered"
  );

  const [{ data: scanResults }, { data: orphanedResults }] = useSuspenseQueries(
    {
      queries: [
        trpc.torrents.scanTorrents.queryOptions(),
        trpc.paths.scanForOrphans.queryOptions(),
      ],
    }
  );

  const { data: classifyResults } = useSuspenseQuery(
    trpc.torrents.classifyTorrents.queryOptions(scanResults)
  );

  const allResults = useMemo(() => {
    if (selectedType === "orphaned") {
      return orphanedResults;
    }
    return selectedType
      ? classifyResults.filter((p) => p.type === selectedType)
      : classifyResults;
  }, [classifyResults, orphanedResults, selectedType]);

  const deleteTorrentsMutation = useMutation(
    trpc.torrents.deleteTorrents.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.torrents.scanTorrents.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.torrents.classifyTorrents.queryKey(),
        });
      },
      onError: (error) => {
        console.error("Cleanup failed", error);
      },
    })
  );

  const handleCleanup = () => {
    setShowConfirm(true);
  };

  const handleCancelCleanup = () => {
    setShowConfirm(false);
  };

  const handleConfirmCleanup = () => {
    if (selectedType === "orphaned") {
      // TODO: Implement orphaned path deletion
      console.warn("Orphaned path deletion not yet implemented");
    } else {
      deleteTorrentsMutation.mutate({
        infoHashes: allResults.map(
          (p) => (p as ProblemTorrent).torrentInfo.infoHash
        ),
      });
    }
    setShowConfirm(false);
  };

  const handleRescan = () => {
    queryClient.invalidateQueries({
      queryKey: [
        trpc.torrents.scanTorrents.queryKey(),
        trpc.paths.scanForOrphans.queryKey(),
      ],
    });
  };

  const totalProblemSize = allResults.reduce((sum, p) => sum + p.size, 0);

  const buttonText =
    selectedType === "orphaned"
      ? `Delete ${allResults.length} orphaned paths`
      : `Delete ${allResults.length} ${selectedType} torrents`;

  return (
    <Flex gap={4} direction="column">
      <Flex justify="space-between" gap={2} align="center">
        <Box marginRight="auto">
          <TypeFilter
            selectedType={selectedType}
            problemTorrents={classifyResults}
            orphanedPaths={orphanedResults}
            onChange={setSelectedType}
          />
        </Box>
        <Button onClick={handleRescan} colorScheme="primary" variant="outline">
          Refresh
        </Button>
        <Button
          onClick={handleCleanup}
          disabled={allResults.length === 0 || selectedType === "healthy"}
        >
          {buttonText}
        </Button>
      </Flex>
      <GarbageSummary
        totalPaths={classifyResults.length + orphanedResults.length}
        totalSize={[...classifyResults, ...orphanedResults].reduce(
          (sum, p) => sum + p.size,
          0
        )}
        selectedPaths={allResults.length}
        selectedSize={allResults.reduce((sum, p) => sum + p.size, 0)}
      />
      {allResults.length === 0 ? (
        <Text fontSize="lg">No problems match the selected filter.</Text>
      ) : (
        <ProblemPathsTable
          problemPaths={allResults}
          showing={
            selectedType === "orphaned" ? "orphanedPaths" : "problemTorrents"
          }
        />
      )}
      <ConfirmDialog
        showConfirm={showConfirm}
        onCancel={handleCancelCleanup}
        onConfirm={handleConfirmCleanup}
        length={allResults.length}
        totalProblemSize={totalProblemSize}
      />
    </Flex>
  );
}
