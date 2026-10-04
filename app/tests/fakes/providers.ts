export type FakeEmailMessage = {
  html: string;
  subject: string;
  to: string;
};

class RecordingEmailProviderFake {
  readonly messages: FakeEmailMessage[] = [];

  constructor(private readonly provider: "brevo") {}

  async send(message: FakeEmailMessage): Promise<{ id: string }> {
    this.messages.push(message);

    return { id: `${this.provider}-${this.messages.length}` };
  }
}

export class RecordingBrevoFake extends RecordingEmailProviderFake {
  constructor() {
    super("brevo");
  }
}
