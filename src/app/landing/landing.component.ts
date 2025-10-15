import { Component, Pipe, PipeTransform } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

function uuid() {
  return 'xxxxxxxx'.replace(/x/g, () => ((Math.random() * 16) | 0).toString(16));
}

interface ScheduleItem {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  start: string; // HH:MM
  end: string; // HH:MM
  location?: string;
  notes?: string;
  type: 'class' | 'event';
}

@Pipe({ name: 'byDayTime', standalone: true })
export class ByDayTimePipe implements PipeTransform {
  transform(list: ScheduleItem[], dayName: string, startHHmm: string) {
    if (!Array.isArray(list)) return [];
    return list.filter((x) => {
      const d = new Date(x.date + 'T00:00:00');
      const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
      return weekday === dayName && x.start === startHHmm;
    });
  }
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [FormsModule, CommonModule, ByDayTimePipe],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss'],
})
export class LandingComponent {
  days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  times = [
    '08:00',
    '09:00',
    '10:00',
    '11:00',
    '12:00',
    '13:00',
    '14:00',
    '15:00',
    '16:00',
    '17:00',
  ];

  items: ScheduleItem[] = [];
  upcoming: ScheduleItem[] = [];
  showForm = false;
  form: Partial<ScheduleItem> = {
    type: 'class',
    title: '',
    date: '',
    start: '',
    end: '',
    location: '',
    notes: '',
  };

  constructor() {
    this.refresh();
  }

  read(): ScheduleItem[] {
    // const raw = localStorage.getItem('schedule_data');
    // return raw ? JSON.parse(raw) : [];
    return [
      {
        id: '1',
        type: 'class',
        title: 'Sample Class',
        date: '2024-06-03',
        start: '10:00',
        end: '11:00',
        location: 'Room 101',
        notes: 'This is a sample class.',
      },
    ];
  }
  write(list: ScheduleItem[]) {
    // localStorage.setItem('schedule_data', JSON.stringify(list));
  }

  refresh() {
    this.items = this.read();
    const nowKey = new Date().toISOString().slice(0, 16);
    this.upcoming = this.items
      .filter((x) => x.date + 'T' + x.start >= nowKey)
      .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
      .slice(0, 5);
  }

  open(type: 'class' | 'event') {
    this.form = { type, title: '', date: '', start: '', end: '', location: '', notes: '' };
    this.showForm = true;
  }
  cancel() {
    this.showForm = false;
  }

  quickAdd(day: string, startHHmm: string) {
    const today = new Date();
    const diffToMonday = (today.getDay() + 6) % 7;
    const monday = new Date(today);
    monday.setDate(today.getDate() - diffToMonday);

    const dayIndex = this.days.indexOf(day);
    const target = new Date(monday);
    target.setDate(monday.getDate() + dayIndex);

    const date = target.toISOString().slice(0, 10);
    const [hh, mm] = startHHmm.split(':');
    const end = String(parseInt(hh, 10) + 1).padStart(2, '0') + ':' + mm;

    this.form = { type: 'class', title: '', date, start: startHHmm, end, location: '', notes: '' };
    this.showForm = true;
  }

  recalc() {
    /* 占位：当前左侧卡片显示 items.length * 2 */
  }

  add() {
    if (!this.form.title || !this.form.date || !this.form.start || !this.form.end) return;
    const newItem: ScheduleItem = {
      id: uuid(),
      title: this.form.title!,
      date: this.form.date!,
      start: this.form.start!,
      end: this.form.end!,
      location: this.form.location,
      notes: this.form.notes,
      type: (this.form.type as 'class' | 'event') || 'class',
    };
    const all = this.read();
    all.push(newItem);
    this.write(all);
    this.showForm = false;
    this.form = { type: 'class', title: '', date: '', start: '', end: '', location: '', notes: '' };
    this.refresh();
  }

  remove(id: string) {
    const all = this.read().filter((x) => x.id !== id);
    this.write(all);
    this.refresh();
  }
}
