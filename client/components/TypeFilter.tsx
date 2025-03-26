import { Button, Flex } from "@chakra-ui/react";
import type {
  OrphanedPath,
  ProblemTorrent,
  ProblemType,
} from "../../server/types";

interface TypeFilterProps {
  selectedType: ProblemType | "orphaned";
  problemTorrents: ProblemTorrent[];
  orphanedPaths: OrphanedPath[];
  onChange: (type: ProblemType | "orphaned") => void;
}

const PROBLEM_TYPES: (ProblemType | "orphaned")[] = [
  "unregistered",
  "missingFiles",
  "timeout",
  "unknown",
  "healthy",
  "orphaned",
];

export function TypeFilter({
  selectedType,
  problemTorrents,
  orphanedPaths,
  onChange,
}: TypeFilterProps) {
  const counts = {
    ...Object.groupBy(problemTorrents, (p) => p.type),
    orphaned: orphanedPaths,
  };

  return (
    <Flex gap={2} align="center">
      {PROBLEM_TYPES.map((type) => (
        <Button
          key={type}
          value={type}
          variant={selectedType === type ? "solid" : "subtle"}
          onClick={() => onChange(type)}
        >
          {type} ({counts[type]?.length ?? 0})
        </Button>
      ))}
    </Flex>
  );
}
