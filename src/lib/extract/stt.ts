import { gateway, transcribe } from "ai";
import { getSttModel } from "./schema";

export type TranscribeRecordingInput = {
  /** Raw audio bytes. */
  bytes: Uint8Array;
  mimeType: string;
  /** Override STT model id (gateway form: provider/model). */
  model?: string;
};

/**
 * Server STT for one Recording (ADR-0007 / issue #9).
 * Default: openai/gpt-4o-mini-transcribe via AI Gateway.
 * Empty or whitespace-only transcript is treated as failure by the caller.
 */
export async function transcribeRecording(
  input: TranscribeRecordingInput,
): Promise<{ text: string }> {
  const modelId = input.model ?? getSttModel();
  const audio = Buffer.from(input.bytes);

  const result = await transcribe({
    model: gateway.transcriptionModel(modelId),
    audio,
    providerOptions: {
      openai: {
        // Russian short expense/income utterances (issue #9).
        language: "ru",
      },
    },
  });

  return { text: result.text ?? "" };
}

/** True when STT output is usable for language extract. */
export function isUsableTranscript(text: string): boolean {
  return text.trim().length > 0;
}
