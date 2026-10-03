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
</script>

<template>
  <AlertDialog :open="!!pending" @update:open="(open) => !open && answer(false)">
    <AlertDialogContent v-if="pending">
      <AlertDialogHeader>
        <AlertDialogTitle>{{ pending.title }}</AlertDialogTitle>
        <AlertDialogDescription v-if="pending.description">{{ pending.description }}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel @click="answer(false)">Отмена</AlertDialogCancel>
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
