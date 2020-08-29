import CodeMirror from 'codemirror';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/addon/hint/show-hint';
import 'codemirror/addon/lint/lint';
import 'codemirror/addon/hint/show-hint.css';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/base16-light.css';
import 'codemirror-graphql/hint';
import 'codemirror-graphql/lint';
import 'codemirror-graphql/mode';
import { createClient } from '@urql/core';
import { getIntrospectionQuery, buildClientSchema } from 'graphql';

const urqlClient = createClient({ url: '/graphql' });

if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('./worker.js')
    .then(function (registration) {
      console.log('Registration successful, scope is:', registration.scope);
    })
    .catch(function (error) {
      console.log('Service worker registration failed, error:', error);
    });
}

function getFetchCode(q, v) {
  return `fetch('/graphql', {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: \`${JSON.stringify({ query: q, variables: v }, undefined, 2)}\`
  }).then((res) => res.json())`;
}
function getUrqlCode(q, v) {
  return `client.query(\`${q}\`, ${JSON.stringify(
    v,
    undefined,
    2
  )}).toPromise();`;
}

let query = `query pokemon($id: ID, $name: String) { 
  pokemon(id: $id, name: $name) {
    id
    name
  }
}`;
let variables = { id: 1 };

// Code sections
const fetchCM = CodeMirror(document.querySelector('#codeFetch'), {
  theme: 'base16-light',
  lineNumbers: true,
  readOnly: true,
  value: getFetchCode(query, variables),
});
const urqlCM = CodeMirror(document.querySelector('#codeUrql'), {
  theme: 'base16-light',
  lineNumbers: true,
  readOnly: true,
  value: getUrqlCode(query, variables),
});
CodeMirror.fromTextArea(document.querySelector('#codeHowWork'), {
  mode: { name: 'javascript', json: true },
  theme: 'base16-light',
  lineNumbers: true,
  readOnly: true,
});

function setQuery(q, v) {
  if (typeof v === 'string') {
    try {
      v = JSON.parse(v);
    } catch (e) {
      // noop
      console.log(v);
      return;
    }
  }

  query = q;
  variables = v;

  fetchCM.setValue(getFetchCode(q, v));

  urqlCM.setValue(getUrqlCode(q, v));
}

// Initial
(async () => {
  const schema = await fetch(
    `/graphql?query=${getIntrospectionQuery({ descriptions: false })}`
  )
    .then((res) => res.json())
    .then((json) => buildClientSchema(json.data))
    .catch(() => null);

  CodeMirror(document.querySelector('#query'), {
    mode: 'graphql',
    theme: 'base16-light',
    value: query,
    lineNumbers: true,
    lint: { schema },
    hintOptions: { schema },
    extraKeys: { 'Ctrl-Space': 'autocomplete' },
  }).on('change', (instance) => {
    setQuery(instance.getValue(), variables);
  });
})();
CodeMirror(document.querySelector('#variables'), {
  mode: { name: 'javascript', json: true },
  theme: 'base16-light',
  value: JSON.stringify(variables, undefined, 2),
  lineNumbers: true,
}).on('change', (instance) => {
  setQuery(query, instance.getValue());
});

const resultCM = CodeMirror(document.querySelector('#result'), {
  mode: { name: 'javascript', json: true },
  theme: 'base16-light',
  lineNumbers: true,
  readOnly: true,
});

function printResult(json, duration) {
  resultCM.setValue(JSON.stringify(json, undefined, 2));
  document.querySelector('#result-ms').innerText = duration.toFixed();
}
function resetResult() {
  document.querySelector('#result').value = null;
}
// Via fetch
document.querySelector('#queryFetch').onclick = async () => {
  resetResult();
  const t0 = performance.now();
  const res = await fetch(`/graphql`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });
  printResult(await res.json(), performance.now() - t0);
};
// Via urql
document.querySelector('#queryUrql').onclick = async () => {
  resetResult();
  const t0 = performance.now();
  const result = await urqlClient.query(query, variables).toPromise();
  printResult({ data: result.data }, performance.now() - t0);
};
