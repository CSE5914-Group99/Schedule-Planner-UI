import { Component, input, output, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Event, DayOfWeek } from '../../models/schedule.model';

@Component({
  selector: 'app-event-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './event-dialog.component.html',
  styleUrls: ['./event-dialog.component.scss']
})
export class EventDialogComponent implements OnInit {
  event = input<Event | null>(null);
  save = output<Event>();
  delete = output<string>();
  cancel = output<void>();

  // Form state
  title = signal('');
  description = signal('');
  startTime = signal('08:00');
  endTime = signal('09:00');
  selectedDays = signal<Set<DayOfWeek>>(new Set());

  allDays: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  isEdit = signal(false);
  currentEventId = signal<string | undefined>(undefined);

  ngOnInit() {
    const eventData = this.event();
    if (eventData) {
      this.isEdit.set(true);
      this.currentEventId.set(eventData.id);
      this.title.set(eventData.title);
      this.description.set(eventData.description || '');
      this.startTime.set(eventData.startTime);
      this.endTime.set(eventData.endTime);
      this.selectedDays.set(new Set(eventData.repeatDays));
    }
  }

  toggleDay(day: DayOfWeek) {
    const days = new Set(this.selectedDays());
    if (days.has(day)) {
      days.delete(day);
    } else {
      days.add(day);
    }
    this.selectedDays.set(days);
  }

  isDaySelected(day: DayOfWeek): boolean {
    return this.selectedDays().has(day);
  }

  onSave() {
    if (!this.title().trim()) {
      alert('Please enter an event title');
      return;
    }

    if (this.selectedDays().size === 0) {
      alert('Please select at least one day');
      return;
    }

    const event: Event = {
      id: this.currentEventId(),
      title: this.title().trim(),
      description: this.description().trim() || undefined,
      startTime: this.startTime(),
      endTime: this.endTime(),
      repeatDays: Array.from(this.selectedDays())
    };

    this.save.emit(event);
  }

  onDelete() {
    const id = this.currentEventId();
    if (id) {
      this.delete.emit(id);
    }
  }

  onCancel() {
    this.cancel.emit();
  }
}
