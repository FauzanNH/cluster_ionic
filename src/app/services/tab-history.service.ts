import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TabHistoryService {
  private stacks: { [tab: string]: string[] } = {
    beranda: [],
    chat: [],
    profile: [],
    lainnya: []
  };
  private activeTab: string = 'beranda';

  setActiveTab(tab: string) {
    this.activeTab = tab;
  }

  push(url: string) {
    if (!this.stacks[this.activeTab]) this.stacks[this.activeTab] = [];
    const stack = this.stacks[this.activeTab];
    if (stack.length === 0 || stack[stack.length - 1] !== url) {
      stack.push(url);
    }
  }

  pop(): string | undefined {
    const stack = this.stacks[this.activeTab];
    if (stack && stack.length > 1) {
      stack.pop();
      return stack[stack.length - 1];
    }
    return undefined;
  }

  reset(tab: string, url: string) {
    this.stacks[tab] = [url];
  }

  getActiveTabStack() {
    return this.stacks[this.activeTab];
  }

  getActiveTab() {
    return this.activeTab;
  }
}
