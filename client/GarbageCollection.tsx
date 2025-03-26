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
import { ProblemTorrentsTable } from "./components/ProblemTorrentsTable";
import { TypeFilter } from "./components/TypeFilter";
import { trpc } from "./utils/trpc";
import { Checkbox } from "./ui/checkbox";
import { OrphanedPathsTable } from "./components/OrphanedPathsTable";

export function GarbageCollection() {
  const queryClient = useQueryClient();
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedType, setSelectedType] = useState<ProblemType | "orphaned">(
    "unregistered"
  );
  const [showOnlyStale, setShowOnlyStale] = useState(false);

  const { data: scanResults } = useSuspenseQuery(
    trpc.torrents.scanTorrents.queryOptions()
  );

  const [{ data: classifyResults }, { data: orphanedResults }] =
    useSuspenseQueries({
      queries: [
        trpc.torrents.classifyTorrents.queryOptions(scanResults),
        trpc.paths.scanForOrphans.queryOptions({
          allTorrents: scanResults.map((p) => p.torrentInfo),
        }),
      ],
    });

  const filteredResults = useMemo(() => {
    let results =
      selectedType === "orphaned"
        ? orphanedResults
        : selectedType
        ? classifyResults.filter((p) => p.type === selectedType)
        : classifyResults;

    if (selectedType === "orphaned" && showOnlyStale) {
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      results = (results as OrphanedPath[]).filter(
        (p) => p.lastModified < thirtyDaysAgo
      );
    }

    return results;
  }, [classifyResults, orphanedResults, selectedType, showOnlyStale]);

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

  const buttonText =
    selectedType === "orphaned"
      ? `Delete ${filteredResults.length} orphaned paths`
      : `Delete ${filteredResults.length} ${selectedType} torrents`;

  const filteredSize = filteredResults.reduce((sum, p) => sum + p.size, 0);

  return (
    <Flex gap={4} direction="column">
      <Flex justify="space-between" gap={2} align="center">
        <Box marginRight="auto">
          <Flex gap={4} align="center">
            <TypeFilter
              selectedType={selectedType}
              problemTorrents={classifyResults}
              orphanedPaths={orphanedResults}
              onChange={setSelectedType}
            />
            {selectedType === "orphaned" && (
              <Checkbox
                checked={showOnlyStale}
                onCheckedChange={(details) =>
                  setShowOnlyStale(details.checked === true)
                }
              >
                only 30+ days old
              </Checkbox>
            )}
          </Flex>
        </Box>
        <Button onClick={handleRescan} colorScheme="primary" variant="outline">
          Refresh
        </Button>
        <Button
          onClick={handleCleanup}
          disabled={filteredResults.length === 0 || selectedType === "healthy"}
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
        selectedPaths={filteredResults.length}
        selectedSize={filteredSize}
      />
      {filteredResults.length === 0 ? (
        <Text fontSize="lg">No problems match the selected filter.</Text>
      ) : selectedType === "orphaned" ? (
        <OrphanedPathsTable orphanedPaths={filteredResults as OrphanedPath[]} />
      ) : (
        <ProblemTorrentsTable
          problemTorrents={filteredResults as ProblemTorrent[]}
        />
      )}
      <ConfirmDialog
        showConfirm={showConfirm}
        onCancel={handleCancelCleanup}
        onConfirm={handleConfirmCleanup}
        length={filteredResults.length}
        selectedSize={filteredSize}
      />
    </Flex>
  );
}
