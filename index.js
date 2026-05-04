
```javascript
import Anthropic from "@anthropic-ai/sdk";
import * as readline from "readline";

const client = new Anthropic();

interface Reminder {
  id: number;
  medicationName: string;
  dosage: string;
  frequency: string;
  time: string;
  notes: string;
}

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

class MedicationReminderApp {
  private reminders: Reminder[] = [];
  private nextId: number = 1;
  private conversationHistory: ConversationMessage[] = [];

  private systemPrompt = `You are a helpful medication reminder assistant. You help users manage their medication schedules and reminders.

You can help users:
1. Add new medication reminders
2. View their medication schedule
3. Remove medication reminders
4. Get alerts about upcoming medications
5. Provide health and medication advice (general information only, not medical diagnosis)

When users want to add medications, extract:
- Medication name
- Dosage (e.g., "500mg", "2 tablets")
- Frequency (e.g., "once daily", "twice daily", "every 4 hours")
- Time of day (e.g., "8am", "8:00 AM")
- Any additional notes

Format medication additions clearly and ask for confirmation.

For reminders due soon (within 30 minutes), provide clear alert messages.

Always be empathetic and supportive about medication adherence.`;

  async chat(userMessage: string): Promise<string> {
    this.conversationHistory.push({
      role: "user",
      content: userMessage,
    });

    try {
      const response = await client.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        system: this.systemPrompt,
        messages: this.conversationHistory,
      });

      const assistantMessage =
        response.content[0].type === "text" ? response.content[0].text : "";

      this.conversationHistory.push({
        role: "assistant",
        content: assistantMessage,
      });

      this.processUserRequest(userMessage, assistantMessage);

      return assistantMessage;
    } catch (error) {
      console.error("Error communicating with Claude:", error);
      throw error;
    }
  }

  private processUserRequest(
    userMessage: string,
    assistantResponse: string
  ): void {
    const lowerMessage = userMessage.toLowerCase();

    if (
      lowerMessage.includes("add") &&
      (lowerMessage.includes("medication") ||
        lowerMessage.includes("reminder"))
    ) {
      this.parseAndAddMedication(userMessage);
    } else if (lowerMessage.includes("view") || lowerMessage.includes("list")) {
      // View is handled by assistant response
    } else if (
      lowerMessage.includes("remove") ||
      lowerMessage.includes("delete")
    ) {
      this.parseAndRemoveMedication(userMessage);
    } else if (
      lowerMessage.includes("alert") ||
      lowerMessage.includes("upcoming")
    ) {
      // Alerts handled by assistant
    }
  }

  private parseAndAddMedication(userMessage: string): void {
    // Use keywords to extract medication info
    let medicationName = "";
    let dosage = "";
    let frequency = "";
    let time = "";
    let notes = "";

    // Simple pattern matching for medication extraction
    const medicationMatch = userMessage.match(
      /(?:medication|drug|medicine|take)\s+([a-z]+(?:\s+[a-z]+)*)/i
    );
    if (medicationMatch) {
      medicationName = medicationMatch[1].trim();
    }

    const dosageMatch = userMessage.match(/(\d+\s*(?:mg|g|ml|tablet|pill|dose)s?)/i);
    if (dosageMatch) {
      dosage = dosageMatch[1].trim();
    }

    const frequencyMatch = userMessage.match(
      /(once|twice|three times|daily|every\s+\d+\s+hours)/i
    );
    if (frequencyMatch) {
      frequency = frequencyMatch[1].trim();
    }

    const timeMatch = userMessage.match(/(\d{1,2}:?\d{0,2}\s*(?:am|pm|AM|PM)?)/);
    if (timeMatch) {
      time = timeMatch[1].trim();
    }

    if (medicationName && dosage && frequency && time) {
      const reminder: Reminder = {
        id: this.nextId++,
        medicationName,
        dosage,
        frequency,
        time,
        notes,
      };
      this.reminders.push(reminder);
      console.log(`\n✓ Added reminder: ${medicationName} ${dosage} at ${time}`);
    }
  }

  private parseAndRemoveMedication(userMessage: string): void {
    const idMatch = userMessage.match(/(?:id|#)\s*(\d+)/i);
    if (idMatch) {
      const id = parseInt(idMatch[1]);
      const initialLength = this.reminders.length;
      this.reminders = this.reminders.filter((r) => r.id !== id);
      if (this.reminders.length < initialLength) {
        console.log(`\n✓ Removed medication reminder with ID ${id}`);
      }
    }
  }

  listReminders(): string {
    if (this.reminders.length === 0) {
      return "No medication reminders set yet.";
    }

    let list = "Current Medication Reminders:\n";
    this.reminders.forEach((reminder) => {
      list += `\n[ID: ${reminder.id}] ${reminder.medicationName}\n`;
      list += `  Dosage: ${reminder.dosage}\n`;
      list += `  Frequency