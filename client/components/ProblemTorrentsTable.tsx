import { Box, Badge, Flex, Button, Icon, Text } from "@chakra-ui/react";
import { Table } from "@chakra-ui/react";
import { filesize } from "filesize";
import type { ProblemTorrent } from "../../server/types";

export type ProblemTorrentsTableProps = {
  problemTorrents: ProblemTorrent[];
};

export function ProblemTorrentsTable({
  problemTorrents,
}: ProblemTorrentsTableProps) {
  return (
    <Flex direction="column" gap={2}>
      <Box alignSelf="end">
        <Text>
          Displaying {Math.min(problemTorrents.length, 200)} of{" "}
          {problemTorrents.length}
        </Text>
      </Box>
      <Table.Root variant="line" size="sm">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Type</Table.ColumnHeader>
            <Table.ColumnHeader>Name</Table.ColumnHeader>
            <Table.ColumnHeader>Directory</Table.ColumnHeader>
            <Table.ColumnHeader>Message</Table.ColumnHeader>
            <Table.ColumnHeader>Size</Table.ColumnHeader>
            <Table.ColumnHeader>Last Modified</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {problemTorrents.slice(0, 200).map((problem, index) => (
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
                {problem.path.split("/").at(-1)}
              </Table.Cell>
              <Table.Cell>{problem.path.split("/").at(-2)}</Table.Cell>
              <Table.Cell
                maxW="sm"
                textOverflow="ellipsis"
                overflow="hidden"
                whiteSpace="nowrap"
                title={problem.torrentInfo.message || "--"}
              >
                {problem.torrentInfo.message || "--"}
              </Table.Cell>
              <Table.Cell>{filesize(problem.size)}</Table.Cell>
              <Table.Cell>
                {new Date(problem.lastModified).toLocaleDateString("sv")}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Flex>
  );
}
