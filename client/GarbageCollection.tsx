import { Box, Button, Flex, Heading, Text } from "@chakra-ui/react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useState, useMemo } from "react";
import type { CleanupResult, ProblemPath, ProblemType } from "../server/types";
import { trpc } from "./utils/trpc";
import { TypeFilter } from "./components/TypeFilter";
import { ProblemPathsTable } from "./components/ProblemPathsTable";
import { filesize } from "filesize";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { GarbageSummary } from "./components/GarbageSummary";

export function GarbageCollection() {
  const queryClient = useQueryClient();
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<Set<ProblemType>>(
    new Set(["missingFiles", "orphaned", "timeout", "unknown", "unregistered"])
  );

  const summaryBg = "bg.muted";
  const successBg = "success.50";
  const successColor = "success.700";
  const warningBg = "warning.50";
  const warningColor = "warning.700";

  const { data: scanResults } = useSuspenseQuery(
    trpc.torrents.scanTorrents.queryOptions()
  );

  const { data: classifyResults } = useSuspenseQuery(
    trpc.torrents.classifyTorrents.queryOptions(scanResults.torrentPaths)
  );

  const allResults = useMemo(
    () => [...classifyResults, ...scanResults.orphanedPaths],
    [classifyResults, scanResults.orphanedPaths]
  );

  const cleanupMutation = useMutation(
    trpc.torrents.cleanupTorrents.mutationOptions({
      onSuccess: (result: CleanupResult) => {
        console.log("Cleanup successful", result);
        queryClient.invalidateQueries({
          queryKey: trpc.torrents.scanTorrents.queryKey(),
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

  const handleConfirmCleanup = () => {
    cleanupMutation.mutate({ paths: allResults.map((p) => p.path) });
    setShowConfirm(false);
  };

  const handleCancelCleanup = () => {
    setShowConfirm(false);
  };

  const filteredProblemPaths = useMemo(() => {
    return selectedTypes.size === 0
      ? allResults
      : allResults.filter((p: ProblemPath) => selectedTypes.has(p.type));
  }, [allResults, selectedTypes]);

  const handleRescan = () => {
    queryClient.invalidateQueries({
      queryKey: trpc.torrents.scanTorrents.queryKey(),
    });
  };

  const totalProblemSize = allResults.reduce(
    (sum, p: ProblemPath) => sum + p.size,
    0
  );

  return (
    <Flex gap={4} direction="column">
      <Flex justify="space-between" gap={2}>
        <Box marginRight="auto">
          <TypeFilter
            selectedTypes={selectedTypes}
            problemPaths={allResults}
            onChange={setSelectedTypes}
          />
        </Box>
        <Button onClick={handleRescan} colorScheme="primary" variant="outline">
          Refresh
        </Button>
        <Button
          onClick={handleCleanup}
          colorScheme="danger"
          disabled={filteredProblemPaths.length === 0}
        >
          Clean Up All
        </Button>
      </Flex>
      <GarbageSummary
        totalPaths={allResults.length}
        totalSize={totalProblemSize}
      />
      {filteredProblemPaths.length === 0 ? (
        <Box p={4} bg={successBg} color={successColor} borderRadius="md">
          <Text>
            {allResults.length === 0
              ? "No problems found! Your torrents and filesystem are clean."
              : "No problems match the selected filter."}
          </Text>
        </Box>
      ) : (
        <ProblemPathsTable problemPaths={filteredProblemPaths} />
      )}
      <ConfirmDialog
        showConfirm={showConfirm}
        onCancel={handleCancelCleanup}
        onConfirm={handleConfirmCleanup}
        length={filteredProblemPaths.length}
        totalProblemSize={totalProblemSize}
      />
    </Flex>
  );
}
