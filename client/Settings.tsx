import {
  Box,
  Button,
  Flex,
  Heading,
  Input,
  NumberInput,
  Text,
  Textarea,
} from "@chakra-ui/react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { trpc } from "./utils/trpc";
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
  DialogCloseTrigger,
} from "./ui/dialog";
import { NumberInputField } from "./ui/number-input";

function parseDataDirsText(dataDirsText: string) {
  return dataDirsText
    .split("\n")
    .map((line) => line.trim())
    .filter((dir) => dir !== "");
}

export function Settings() {
  const [open, setOpen] = useState(false);
  const [rtorrentUrl, setRtorrentUrl] = useState<string>("");
  const [dataDirsText, setDataDirsText] = useState<string>("");
  const [failPastThreshold, setFailPastThreshold] = useState<string>("0.02");
  const queryClient = useQueryClient();

  const { data } = useSuspenseQuery(trpc.settings.getSettings.queryOptions());

  useEffect(() => {
    if (data) {
      setRtorrentUrl(data.rtorrentUrl);
      setDataDirsText(
        data.dataDirs && data.dataDirs.length > 0
          ? data.dataDirs.join("\n")
          : ""
      );
      setFailPastThreshold(String(data.failPastThreshold));
    }
  }, [data]);

  const {
    mutate: updateSettings,
    error,
    isPending,
  } = useMutation(
    trpc.settings.updateSettings.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.settings.getSettings.queryKey(),
        });
        setOpen(false);
      },
    })
  );

  const saveSettings = () => {
    const filteredDirs = parseDataDirsText(dataDirsText);

    updateSettings({
      rtorrentUrl,
      dataDirs: filteredDirs,
      failPastThreshold: parseFloat(failPastThreshold),
    });
  };

  const handleOpenChange = (details: any) => {
    setOpen(details.open);
  };

  return (
    <DialogRoot open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" colorScheme="gray" variant="outline">
          Settings
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <DialogBody>
          <Flex direction="column" gap={4}>
            <Box>
              <Text fontWeight="bold" mb={2}>
                rTorrent URL
              </Text>
              <Input
                value={rtorrentUrl}
                onChange={(e) => setRtorrentUrl(e.target.value)}
                placeholder="http://localhost:8000"
              />
            </Box>
            <Box>
              <Text fontWeight="bold" mb={2}>
                Data Directories ({parseDataDirsText(dataDirsText).length})
              </Text>
              <Textarea
                value={dataDirsText}
                onChange={(e) => setDataDirsText(e.target.value)}
                placeholder="/path/to/data1&#10;/path/to/data2"
                rows={5}
              />
              <Text fontSize="sm" mt={1} color="text.subtle">
                Enter one directory per line
              </Text>
            </Box>
            <Box>
              <Text fontWeight="bold" mb={2}>
                Fail Past Threshold
              </Text>
              <Input
                value={failPastThreshold}
                onChange={(e) => setFailPastThreshold(e.target.value)}
                placeholder="0.02"
              />
            </Box>
          </Flex>
        </DialogBody>

        <DialogFooter>
          <Flex justifyContent="space-between">
            {error && (
              <Text color="red" fontSize="sm">
                {error.message}
              </Text>
            )}
          </Flex>
          <Button
            colorScheme="primary"
            onClick={saveSettings}
            loading={isPending}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}
