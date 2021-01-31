<script>
  import {
    initClient,
    operationStore,
    query,
    mutation,
    subscription,
    dedupExchange,
    fetchExchange,
    subscriptionExchange,
  } from "@urql/svelte";
  import { cacheExchange } from '@urql/exchange-graphcache';
  import { createClient as createWSClient } from 'graphql-ws';
  const wsClient = createWSClient({
    url: "ws://localhost:3000/graphql",
  });
  initClient({
    url: "/graphql",
    exchanges: [
      dedupExchange,
      cacheExchange({}),
      subscriptionExchange({
        forwardSubscription(operation) {
          return {
            subscribe: (sink) => {
              const dispose = wsClient.subscribe(operation, sink);
              return {
                unsubscribe: dispose,
              };
            },
          };
        },
      }),
      fetchExchange
    ],
  });
  const booksFragment = `id	title	author { name } votes`
  const booksQuery = operationStore(`query { books { ${booksFragment} } }`);
  const bookUpvoteMutate = operationStore(`mutation bookUpvote($bookId: Int!) { bookUpvote(bookId: $bookId) { ${booksFragment} } }`)
  const bookSubscribe = operationStore(`subscription { bookSubscribe { ${booksFragment} } }`)
  query(booksQuery);
  const upvote = mutation(bookUpvoteMutate);
  subscription(bookSubscribe, (prev, data) => data);
</script>

<div>
  {#if $booksQuery.fetching} Loading... {:else if $booksQuery.error} Oh no!
  {$booksQuery.error.message} {:else if !$booksQuery.data} No data {:else}
  <ul>
    {#each $booksQuery.data.books as book}
    <li>
      {book.id}: {book.title} by {book.author.name} - {book.votes} votes
      <button on:click={() => upvote({ bookId: book.id })}>Upvote</button>
    </li>
    {/each}
  </ul>
  {/if}
</div>
