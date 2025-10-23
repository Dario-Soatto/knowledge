import { UIMessage } from 'ai';

// Define your custom message type with data part schemas
export type MyUIMessage = UIMessage<
  never, // metadata type
  {
    sources: {
      title: string;
      url: string;
      similarity: number;
    }[];
  } // data parts type
>;
