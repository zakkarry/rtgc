import { Flex } from "@chakra-ui/react";
import { type ProblemType } from "../../server/types";
import { Checkbox } from "../ui/checkbox";

interface TypeFilterProps {
  selectedTypes: Set<ProblemType>;
  onChange: (types: Set<ProblemType>) => void;
}

const PROBLEM_TYPES: ProblemType[] = [
  "unregistered",
  "orphaned",
  "missingFiles",
  "unknown",
  "timeout",
  "healthy",
];

export function TypeFilter({ selectedTypes, onChange }: TypeFilterProps) {
  return (
    <Flex gap={2} align="center">
      <Checkbox
        checked={
          selectedTypes.size === PROBLEM_TYPES.length
            ? true
            : selectedTypes.size === 0
            ? false
            : "indeterminate"
        }
        onCheckedChange={(checked) => {
          if (checked.checked === "indeterminate") {
            onChange(new Set());
          } else if (checked.checked) {
            onChange(new Set(PROBLEM_TYPES));
          } else {
            onChange(new Set());
          }
        }}
      >
        All types
      </Checkbox>
      {PROBLEM_TYPES.map((type) => (
        <Checkbox
          key={type}
          checked={selectedTypes.has(type)}
          onCheckedChange={(checked) => {
            const newTypes = new Set(selectedTypes);
            checked.checked ? newTypes.add(type) : newTypes.delete(type);
            onChange(newTypes);
          }}
        >
          {type}
        </Checkbox>
      ))}
    </Flex>
  );
}
