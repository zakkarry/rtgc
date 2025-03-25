import { Button, Flex } from "@chakra-ui/react";
import { ProblemPath, type ProblemType } from "../../server/types";
import { Radio, RadioGroup } from "../ui/radio";

interface TypeFilterProps {
  selectedType: ProblemType | null;
  problemPaths: ProblemPath[];
  onChange: (type: ProblemType | null) => void;
}

const PROBLEM_TYPES: ProblemType[] = [
  "unregistered",
  "orphaned",
  "missingFiles",
  "timeout",
  "unknown",
  "healthy",
];

export function TypeFilter({
  selectedType,
  problemPaths,
  onChange,
}: TypeFilterProps) {
  const counts = Object.groupBy(problemPaths, (p) => p.type);

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
