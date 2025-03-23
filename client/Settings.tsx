import {
  Box,
  Button,
  Flex,
  Heading,
  Input,
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

export function Settings() {
  const [open, setOpen] = useState(false);
  const [rtorrentUrl, setRtorrentUrl] = useState<string>("");
  const [dataDirsText, setDataDirsText] = useState<string>("");
  const queryClient = useQueryClient();

  const { data } = useSuspenseQuery(trpc.getSettings.queryOptions());

  useEffect(() => {
    if (data) {
      setRtorrentUrl(data.rtorrentUrl);
      setDataDirsText(
        data.dataDirs && data.dataDirs.length > 0
          ? data.dataDirs.join("\n")
          : ""
      );
    }
  }, [data]);

  const updateSettingsMutation = useMutation(
    trpc.updateSettings.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.getSettings.queryKey(),
        });
        setOpen(false);
      },
    })
  );

  const saveSettings = () => {
    const filteredDirs = dataDirsText
      .split("\n")
      .map((line) => line.trim())
      .filter((dir) => dir !== "");

    updateSettingsMutation.mutate({
      rtorrentUrl,
      dataDirs: filteredDirs,
    });
  };

  const handleOpenChange = (details: any) => {
    setOpen(details.open);
  };

  return (
    <DialogRoot open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" colorScheme="gray" mb={4}>
          Settings
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <DialogBody>
          <Box mb={6}>
            <Text fontWeight="bold" mb={2}>
              rTorrent URL
            </Text>
            <Input
              value={rtorrentUrl}
              onChange={(e) => setRtorrentUrl(e.target.value)}
              placeholder="http://localhost:8000"
            />
          </Box>

          <Box mb={6}>
            <Text fontWeight="bold" mb={2}>
              Data Directories
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

            {dataDirsText.trim() !== "" && (
              <Box
                mt={3}
                p={3}
                bg="bg.muted"
                borderRadius="md"
                maxH="200px"
                overflowY="auto"
              >
                <Text fontSize="sm" fontWeight="bold" mb={2}>
                  Parsed directories:
                </Text>
                {dataDirsText
                  .split("\n")
                  .map((line) => line.trim())
                  .filter((dir) => dir !== "")
                  .map((dir, i) => (
                    <Text key={i} fontSize="sm" mb={1}>
                      {i + 1}. {dir}
                    </Text>
                  ))}
              </Box>
            )}
          </Box>

          <Box p={3} bg="warning.50" color="warning.700" borderRadius="md">
            <Text fontSize="sm">
              Note: Changes to settings require a server restart to take effect.
            </Text>
          </Box>
        </DialogBody>

        <DialogFooter>
          <Button
            colorScheme="primary"
            onClick={saveSettings}
            loading={updateSettingsMutation.isPending}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}
