<script lang="ts">
import type { ScheduleEvent, ScheduleValue } from '@master/ui/behaviors/schedule.js'

export type { ScheduleEvent, ScheduleValue }

/** The words of the header, in the page's language. */
export interface ScheduleLabels {
  today?: string
  previous?: string
  next?: string
  /** The name of the view switch. */
  view?: string
  day?: string
  week?: string
  month?: string
  agenda?: string
}
</script>

<script setup lang="ts">
import { computed, shallowRef, useId, useTemplateRef } from 'vue'
import { schedule, scheduleLayout, type ScheduleItem, type ScheduleMessages } from '@master/ui/behaviors/schedule.js'
import { useBehavior } from './use-behavior'

defineOptions({ inheritAttrs: false })

const { events, today, locale, weekStart, lanes, from, to, messages, labels = {} } = defineProps<{
  events: ScheduleEvent[]
  /** Today, as `YYYY-MM-DD`. Give it when the schedule is rendered on a server, so both sides agree. */
  today?: string
  /** A BCP 47 tag for the names. Give it when the schedule is rendered on a server. */
  locale?: string
  /** The first day of a week, 0 for Sunday to 6 for Saturday. The locale's own by default. */
  weekStart?: number
  /** How many events a day of a month shows before the rest go behind its more button. */
  lanes?: number
  /** The hours a day or a week shows at least. */
  from?: number
  to?: number
  messages?: ScheduleMessages
  labels?: ScheduleLabels
}>()
/** The day and the view on show: `v-model`. Today's month by default. */
const model = defineModel<ScheduleValue>()
/** An event without an `href` is a button: `eventClick` hears it pressed. */
const emit = defineEmits<{ eventClick: [event: ScheduleEvent] }>()

/*
 * A schedule the reader moves through by the day, the week, the month or as an agenda. Vue writes the period
 * from `scheduleLayout()`, the same layout the behavior writes, so it is in the first HTML; the behavior answers
 * the header and the day numbers and asks for the period to show.
 */
const id = useId()
const settings = () => ({ today, locale, weekStart, lanes, from, to, messages })
const first = scheduleLayout(model.value, settings()).value
const shown = shallowRef<ScheduleValue>(first)
const layout = computed(() => scheduleLayout(shown.value, { ...settings(), events }))
const root = useTemplateRef<HTMLElement>('root')
useBehavior(root, schedule, () => ({ ...settings(), value: first, draw: (next: ScheduleValue) => { shown.value = next } }), model)
const more = computed(() => messages?.more ?? ((count: number) => `+${count} more`))
const moreLabel = computed(() => messages?.moreLabel ?? ((count: number, day: string) => `${count} more ${count === 1 ? 'event' : 'events'}, ${day}`))
const words = computed(() => ({ today: 'Today', previous: 'Previous', next: 'Next', view: 'View', day: 'Day', week: 'Week', month: 'Month', agenda: 'Agenda', ...labels }))
const views = ['day', 'week', 'month', 'agenda'] as const
const lane = (item: ScheduleItem) => `--column: ${item.column}; --span: ${item.span}; --lane: ${item.lane}`
const hours = (item: ScheduleItem) => `--start: ${item.start}; --end: ${item.end}; --lane: ${item.lane}; --lanes: ${item.lanes}`
</script>

<template>
  <section class="schedule-view" :aria-labelledby="`${id}-title`" ref="root" v-bind="$attrs">
    <div class="schedule-view-header">
      <button type="button" class="btn btn-sm schedule-view-today">{{ words.today }}</button>
      <button type="button" class="btn btn-sm btn-square btn-quiet schedule-view-previous" :aria-label="words.previous">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg>
      </button>
      <button type="button" class="btn btn-sm btn-square btn-quiet schedule-view-next" :aria-label="words.next">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
      </button>
      <h2 class="schedule-view-title" :id="`${id}-title`" aria-live="polite">{{ layout.title }}</h2>
      <div class="segmented segmented-sm schedule-view-switch" role="radiogroup" :aria-label="words.view">
        <label v-for="name in views" :key="name" class="segmented-item"><input type="radio" class="segmented-input" :name="`${id}-view`" :value="name" :checked="first.view === name" />{{ words[name] }}</label>
      </div>
    </div>
    <div class="schedule-view-body">
      <div v-if="layout.value.view === 'month'" class="schedule-month">
        <div class="schedule-weekdays" aria-hidden="true">
          <span v-for="weekday in layout.weekdays" :key="weekday.name" class="schedule-weekday">{{ weekday.short }}</span>
        </div>
        <ol class="schedule-weeks">
          <li v-for="week in layout.weeks" :key="week.days[0]!.date" class="schedule-week" :style="`--lanes: ${week.lanes}`">
            <template v-for="(day, index) in week.days" :key="day.date">
              <div class="schedule-date" :class="{ 'schedule-date-outside': day.outside }" :style="`--column: ${index + 1}; --count: ${day.count}`" :aria-current="day.today ? 'date' : undefined">
                <button type="button" class="schedule-date-number" :value="day.date" :aria-label="day.summary">{{ day.text }}</button>
              </div>
              <template v-for="item in day.items" :key="item.id">
                <a v-if="item.event.href" :class="['schedule-event', item.classes]" :style="lane(item)" :href="item.event.href" :aria-label="item.label"><span class="schedule-title">{{ item.title }}</span><span v-if="item.time && !item.allDay" class="schedule-time">{{ item.time }}</span></a>
                <button v-else type="button" :class="['schedule-event', item.classes]" :style="lane(item)" :value="item.id" :aria-label="item.label" @click="emit('eventClick', item.event)"><span class="schedule-title">{{ item.title }}</span><span v-if="item.time && !item.allDay" class="schedule-time">{{ item.time }}</span></button>
              </template>
              <template v-if="day.hidden">
                <button type="button" class="schedule-more" :style="`--column: ${index + 1}`" :popovertarget="`${id}-more-${day.date}`" :aria-label="moreLabel(day.hidden, day.label)">{{ more(day.hidden) }}</button>
                <div :id="`${id}-more-${day.date}`" popover="" class="popover">
                  <p class="schedule-agenda-date">{{ day.label }}</p>
                  <ol class="schedule-list">
                    <li v-for="item in day.all" :key="item.id">
                      <a v-if="item.event.href" :class="['schedule-event', item.classes]" :href="item.event.href" :aria-label="item.label"><span class="schedule-title">{{ item.title }}</span><span v-if="item.time && !item.allDay" class="schedule-time">{{ item.time }}</span></a>
                      <button v-else type="button" :class="['schedule-event', item.classes]" :value="item.id" :aria-label="item.label" @click="emit('eventClick', item.event)"><span class="schedule-title">{{ item.title }}</span><span v-if="item.time && !item.allDay" class="schedule-time">{{ item.time }}</span></button>
                    </li>
                  </ol>
                </div>
              </template>
            </template>
          </li>
        </ol>
      </div>
      <template v-else-if="layout.value.view === 'agenda'">
        <ol v-if="layout.agenda.length" class="schedule-agenda">
          <li v-for="day in layout.agenda" :key="day.date" class="schedule-agenda-day" :aria-current="day.today ? 'date' : undefined">
            <h3 class="schedule-agenda-date">{{ day.heading }}</h3>
            <ol class="schedule-list">
              <li v-for="item in day.items" :key="item.id">
                <a v-if="item.event.href" :class="['schedule-event', item.classes]" :href="item.event.href" :aria-label="item.label"><span class="schedule-title">{{ item.title }}</span><span v-if="item.time && !item.allDay" class="schedule-time">{{ item.time }}</span></a>
                <button v-else type="button" :class="['schedule-event', item.classes]" :value="item.id" :aria-label="item.label" @click="emit('eventClick', item.event)"><span class="schedule-title">{{ item.title }}</span><span v-if="item.time && !item.allDay" class="schedule-time">{{ item.time }}</span></button>
              </li>
            </ol>
          </li>
        </ol>
        <div v-else class="empty"><p class="empty-title">{{ layout.words.empty }}</p></div>
      </template>
      <div v-else class="schedule" :style="`--schedule-from: ${layout.from}; --schedule-to: ${layout.to}; --schedule-days: ${layout.days.length}`">
        <ol class="schedule-rail" aria-hidden="true"><li v-for="(label, index) in layout.rail" :key="index">{{ label }}</li></ol>
        <div v-for="(day, index) in layout.days" :key="day.date" class="schedule-day" :style="`--column: ${index + 1}`" :aria-current="day.today ? 'date' : undefined">
          <h3 class="schedule-heading" :aria-label="day.label">{{ layout.days.length > 1 ? day.heading : day.label }}</h3>
          <ol class="schedule-events" :aria-label="day.label">
            <li v-for="item in day.items" :key="item.id">
              <a v-if="item.event.href" :class="['schedule-event', item.classes]" :style="hours(item)" :href="item.event.href" :aria-label="item.label"><span class="schedule-title">{{ item.title }}</span><span v-if="item.time" class="schedule-time">{{ item.time }}</span></a>
              <button v-else type="button" :class="['schedule-event', item.classes]" :style="hours(item)" :value="item.id" :aria-label="item.label" @click="emit('eventClick', item.event)"><span class="schedule-title">{{ item.title }}</span><span v-if="item.time" class="schedule-time">{{ item.time }}</span></button>
            </li>
          </ol>
        </div>
        <div v-if="layout.allDay.length" class="schedule-allday" role="group" :aria-label="layout.words.allDay">
          <span class="schedule-allday-label" aria-hidden="true">{{ layout.words.allDay }}</span>
          <template v-for="item in layout.allDay" :key="item.id">
            <a v-if="item.event.href" :class="['schedule-event', item.classes]" :style="lane(item)" :href="item.event.href" :aria-label="item.label"><span class="schedule-title">{{ item.title }}</span><span v-if="item.time && !item.allDay" class="schedule-time">{{ item.time }}</span></a>
            <button v-else type="button" :class="['schedule-event', item.classes]" :style="lane(item)" :value="item.id" :aria-label="item.label" @click="emit('eventClick', item.event)"><span class="schedule-title">{{ item.title }}</span><span v-if="item.time && !item.allDay" class="schedule-time">{{ item.time }}</span></button>
          </template>
        </div>
      </div>
    </div>
  </section>
</template>
