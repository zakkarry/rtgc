import { Box, Flex, Text } from "@chakra-ui/react";
import { filesize } from "filesize";

interface GarbageSummaryProps {
  totalPaths: number;
  totalSize: number;
  selectedPaths: number;
  selectedSize: number;
}

export function GarbageSummary({
  totalPaths,
  totalSize,
  selectedPaths,
  selectedSize,
}: GarbageSummaryProps) {
  const summaryBg = "bg.muted";

  return (
    <Flex p={4} bg={summaryBg} borderRadius="md" gap={8}>
      <Box>
        <Text fontWeight="bold">Paths</Text>
        <Text fontSize="2xl">{totalPaths}</Text>
      </Box>
      <Box>
        <Text fontWeight="bold">Total Size</Text>
        <Text fontSize="2xl">{filesize(totalSize)}</Text>
      </Box>
      <Box>
        <Text fontWeight="bold">Selected Paths</Text>
        <Text fontSize="2xl">{selectedPaths}</Text>
      </Box>
      <Box>
        <Text fontWeight="bold">Selected Size</Text>
        <Text fontSize="2xl">{filesize(selectedSize)}</Text>
      </Box>
    </Flex>
  );
}
