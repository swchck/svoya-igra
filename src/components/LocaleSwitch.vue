<script setup lang="ts">
import { Languages } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { LOCALES, setLocale, type Locale } from '@/i18n'

const { t, locale } = useI18n()
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" size="sm" :aria-label="t('common.language')">
        <Languages />{{ LOCALES.find((l) => l.code === locale)?.label }}
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuRadioGroup :model-value="locale" @update:model-value="setLocale($event as Locale)">
        <DropdownMenuRadioItem v-for="l in LOCALES" :key="l.code" :value="l.code">{{ l.label }}</DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
