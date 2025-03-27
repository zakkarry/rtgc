import { Box, Button, Flex, Text } from "@chakra-ui/react";
import { useSuspenseQueries, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type {
  OrphanedPath,
  ProblemTorrent,
  ProblemType,
} from "../server/types";
import { DeleteDialog } from "./components/ConfirmDialog";
import { GarbageSummary } from "./components/GarbageSummary";
import { OrphanedPathsTable } from "./components/OrphanedPathsTable";
import { ProblemTorrentsTable } from "./components/ProblemTorrentsTable";
import { TypeFilter } from "./components/TypeFilter";
import { Checkbox } from "./ui/checkbox";
import { trpc } from "./utils/trpc";

export function GarbageCollection() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedType, setSelectedType] = useState<ProblemType | "orphaned">(
    "unregistered"
  );
  const [showOnlyStale, setShowOnlyStale] = useState(true);
  const [showOnlyComplete, setShowOnlyComplete] = useState(true);
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

    if (selectedType === "orphaned" && showOnlyComplete) {
      results = (results as OrphanedPath[]).filter((p) =>
        p.relatedTorrents.every((t) => t.complete)
      );
    }

    return results;
  }, [
    classifyResults,
    orphanedResults,
    selectedType,
    showOnlyStale,
    showOnlyComplete,
  ]);

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
              <Flex gap={2}>
                <Checkbox
                  checked={showOnlyStale}
                  onCheckedChange={(details) =>
                    setShowOnlyStale(details.checked === true)
                  }
                >
                  only 30+ days old
                </Checkbox>
                <Checkbox
                  checked={showOnlyComplete}
                  onCheckedChange={(details) =>
                    setShowOnlyComplete(details.checked === true)
                  }
                >
                  only complete
                </Checkbox>
              </Flex>
            )}
          </Flex>
        </Box>
        <Button
          onClick={() => setShowConfirm(true)}
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
      {showConfirm && (
        <DeleteDialog
          onClose={() => setShowConfirm(false)}
          filteredResults={filteredResults}
        />
      )}
    </Flex>
  );
}
