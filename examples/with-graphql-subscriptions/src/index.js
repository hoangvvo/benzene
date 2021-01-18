import {
  createClient,
  defaultExchanges,
  Provider,
  useMutation,
  useSubscription,
  subscriptionExchange,
} from "@urql/preact";
import { SubscriptionClient } from "subscriptions-transport-ws";

const subscriptionClient = new SubscriptionClient(
  "ws://localhost:3000/graphql",
  { reconnect: true }
);

const client = createClient({
  url: "http://localhost:8080/graphql",
  exchanges: [
    ...defaultExchanges,
    subscriptionExchange({
      forwardSubscription(operation) {
        return subscriptionClient.request(operation);
      },
    }),
  ],
});

const SEND_MESSAGE = `
  mutation addMessage($text: String!) {
    addMessage(text: $text) {
      id
      message
    }
  }
`;

const MESSAGE_ADDED = `
  subscription messageAdded {
    messageAdded {
      id
      message
    }
  }
`;

export default function App() {
  return (
    <Provider value={client}>
      <div>
        <h1>
          <a href="https://github.com/hoangvvo/benzene">@benzene/ws</a> and{" "}
          <a href="https://github.com/apollographql/graphql-subscriptions">
            graphql-subscriptions
          </a>{" "}
          example
        </h1>
        <p>
          Visit <a href="/graphql">/graphql</a> for GraphQL endpoint.
        </p>
        <ChatApp />
      </div>
    </Provider>
  );
}

function ChatApp() {
  const [, sendMessage] = useMutation(SEND_MESSAGE);
  const [res] = useSubscription(
    {
      query: MESSAGE_ADDED,
    },
    (messages = [], response) => [...messages, response.messageAdded]
  );
  console.log(res);
  return (
    <>
      <p>
        <b>Instruction:</b> Open two tabs, send some messages.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage({ text: e.currentTarget.text.value });
        }}
        style={{ display: "flex" }}
      >
        <input name="text" />
        <button type="submit">Send</button>
      </form>
      <div>
        {res.data?.map((message) => (
          <blockquote style="" key={message.id}>
            {message.message}
          </blockquote>
        ))}
      </div>
    </>
  );
}
