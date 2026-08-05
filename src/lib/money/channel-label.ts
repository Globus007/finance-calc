import type { HistoryChannel } from "./history-types";

/** Russian label for capture Channel on History rows. */
export function channelLabelRu(channel: HistoryChannel): string {
  switch (channel) {
    case "photo":
      return "фото";
    case "voice":
      return "голос";
    case "manual":
      return "вручную";
  }
}
