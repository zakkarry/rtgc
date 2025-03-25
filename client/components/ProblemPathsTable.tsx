import { Box, Badge } from "@chakra-ui/react";
import { Table } from "@chakra-ui/react";
import { filesize } from "filesize";
import type { ProblemPath } from "../../server/types";

export function ProblemPathsTable({ problemPaths }: ProblemPathsTableProps) {
  return (
    <Box overflowX="auto">
      <Table.Root variant="line" size="md">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Type</Table.ColumnHeader>
            <Table.ColumnHeader>Path</Table.ColumnHeader>
            <Table.ColumnHeader>Message</Table.ColumnHeader>
            <Table.ColumnHeader>Size</Table.ColumnHeader>
            <Table.ColumnHeader>Last Modified</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {problemPaths.slice(0, 200).map((problem, index) => (
            <Table.Row key={index} _hover={{ bg: "bg.subtle" }}>
              <Table.Cell>
                <Badge>{problem.type}</Badge>
              </Table.Cell>
              <Table.Cell
                maxW="xs"
                textOverflow="ellipsis"
                overflow="hidden"
                whiteSpace="nowrap"
                title={problem.path}
              >
                {problem.path}
              </Table.Cell>
              <Table.Cell>{problem.torrentInfo?.message || "--"}</Table.Cell>
              <Table.Cell>{filesize(problem.size)}</Table.Cell>
              <Table.Cell>
                {new Date(problem.lastModified).toLocaleDateString("sv")}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Box>
  );
}
export interface ProblemPathsTableProps {
  problemPaths: ProblemPath[];
}
