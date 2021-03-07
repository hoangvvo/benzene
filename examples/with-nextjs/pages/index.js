import { useState } from "react";
import { useQuery } from "urql";

export default function Home() {
  const [value, setValue] = useState("");
  const [{ data, status }] = useQuery({
    query: `query pokemon($id: ID!) {
      pokemon(id: $id) {
        id
        name
        sprites {
          front_default
        }
        abilities {
          ability {
            name
          }
          slot
        }
        stats {
          base_stat
          stat {
            name
            url
          }
        }
        types {
          type {
            name
          }
        }
      }
    }
    `,
    variables: { id: value },
  });
  const pokemon = data?.pokemon;
  return (
    <div style={{ padding: "2rem" }}>
      <input
        style={{ width: "100%" }}
        value={value}
        onChange={(e) => setValue(e.currentTarget.value)}
        placeholder="Enter Pokemon name or ID"
      />
      <article>
        {status === "loading" ? (
          "Loading..."
        ) : pokemon ? (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
            }}
          >
            <img
              src={pokemon.sprites.front_default}
              style={{ height: "8rem", width: "8rem", objectFit: "cover" }}
            />
            <div style={{ minWidth: 0, flex: 1 }}>
              <h4>
                {pokemon.name} (#{pokemon.id})
              </h4>
              <details>
                <summary>Types</summary>
                <ul>
                  {pokemon.types.map((type) => (
                    <li key={type.type.name}>
                      {type.type.name}
                    </li>
                  ))}
                </ul>
              </details>
              <details>
                <summary>Stats</summary>
                <ul>
                  {pokemon.stats.map((stat) => (
                    <li key={stat.stat.name}>
                      {stat.stat.name}: <b>{stat.base_stat}</b>
                    </li>
                  ))}
                </ul>
              </details>
              <details>
                <summary>Abilities</summary>
                <ul>
                  {pokemon.abilities.map((ability) => (
                    <li key={ability.ability.name}>{ability.ability.name}</li>
                  ))}
                </ul>
              </details>
            </div>
          </div>
        ) : !value ? (
          "Enter the search box above to query for pokemons"
        ) : (
          "Pokemon is not found!"
        )}
      </article>
    </div>
  );
}
