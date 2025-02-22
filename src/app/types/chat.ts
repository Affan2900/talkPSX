export type User = {
  id: string;
  username: string;
  created_at: string;
};

export type Chat = {
  id: string;
  created_by: string;
  created_at: string;
};

export type Message = {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

