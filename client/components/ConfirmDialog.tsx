import { Text, Button } from "@chakra-ui/react";
import { filesize } from "filesize";
import {
  DialogRoot,
  DialogBackdrop,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from "../ui/dialog";

type ConfirmDialogProps = {
  showConfirm: boolean;
  length: number;
  selectedSize: number;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  showConfirm,
  length,
  selectedSize,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <DialogRoot open={showConfirm} onOpenChange={onCancel}>
      <DialogBackdrop />
      <DialogContent>
        <DialogHeader>Confirm Cleanup</DialogHeader>
        <DialogBody>
          <Text>
            Are you sure you want to delete {length} paths (
            {filesize(selectedSize)})? This action cannot be undone.
          </Text>
        </DialogBody>
        <DialogFooter gap={2}>
          <Button onClick={onCancel} variant="outline">
            Cancel
          </Button>
          <Button colorScheme="danger" onClick={onConfirm}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}
