export interface Message {
  readonly id: string
  readonly content: string
  readonly role: 'user' | 'assistant' | 'system'
  readonly timestamp: Date
  /** The note or page an answer came from, when the server knows it. */
  readonly source?: string
}

export interface ChatModel {
  readonly id: string
  readonly name: string
  readonly description: string
}

export interface ChatState {
  readonly messages: Message[]
  readonly isLoading: boolean
  readonly currentModel: string
}
