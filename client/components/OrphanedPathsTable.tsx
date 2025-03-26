import { Flex, Box, Text, Table } from "@chakra-ui/react";
import { filesize } from "filesize";
import type { OrphanedPath } from "../../server/types";

export function OrphanedPathsTable({
  orphanedPaths,
}: {
  orphanedPaths: OrphanedPath[];
}) {
  return (
    <Flex direction="column" gap={2}>
      <Box alignSelf="end">
        <Text>
          Displaying {Math.min(orphanedPaths.length, 200)} of{" "}
          {orphanedPaths.length}
        </Text>
      </Box>
      <Table.Root variant="line" size="sm">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Name</Table.ColumnHeader>
            <Table.ColumnHeader>Directory</Table.ColumnHeader>
            <Table.ColumnHeader>Size</Table.ColumnHeader>
            <Table.ColumnHeader>Last Modified</Table.ColumnHeader>
            <Table.ColumnHeader>Related Torrents</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {orphanedPaths.slice(0, 200).map((problem, index) => (
            <Table.Row key={index} _hover={{ bg: "bg.subtle" }}>
              <Table.Cell
                maxW="xs"
                textOverflow="ellipsis"
                overflow="hidden"
                whiteSpace="nowrap"
                title={problem.path}
              >
                {problem.path.split("/").at(-1)}
              </Table.Cell>
              <Table.Cell>{problem.path.split("/").at(-2)}</Table.Cell>
              <Table.Cell>{filesize(problem.size)}</Table.Cell>
              <Table.Cell>
                {new Date(problem.lastModified).toLocaleDateString("sv")}
              </Table.Cell>
              <Table.Cell>
                {problem.relatedTorrents.map((t) => t.tracker).join(", ")}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Flex>
  );
}
