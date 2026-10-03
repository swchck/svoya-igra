<script setup lang="ts">
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { buttonVariants } from '@/components/ui/button'
import { useConfirmHost } from '@/composables/useConfirm'

const { pending, answer } = useConfirmHost()

// reka closes the dialog before the action button's own click handler runs; settling
// the close a task later lets an explicit answer win, otherwise every confirm reads "no"
function onOpenChange(open: boolean) {
  if (!open) setTimeout(() => answer(false))
}
</script>

<template>
  <AlertDialog :open="!!pending" @update:open="onOpenChange">
    <AlertDialogContent v-if="pending">
      <AlertDialogHeader>
        <AlertDialogTitle>{{ pending.title }}</AlertDialogTitle>
        <AlertDialogDescription v-if="pending.description">{{ pending.description }}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel @click="answer(false)">{{ pending.cancelLabel ?? 'Отмена' }}</AlertDialogCancel>
        <AlertDialogAction
          :class="pending.destructive ? buttonVariants({ variant: 'destructive' }) : undefined"
          @click="answer(true)"
        >
          {{ pending.confirmLabel ?? 'Да' }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
