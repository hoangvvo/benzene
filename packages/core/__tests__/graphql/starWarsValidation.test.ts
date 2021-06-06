import Benzene from "@benzene/core/src/core";
import { parse, Source } from "graphql";
import { StarWarsSchema } from "./starWarsSchema";

/**
 * Helper function to test a query and the expected response.
 */
function validationErrors(query: string) {
  const GQL = new Benzene({
    schema: StarWarsSchema,
  });
  const source = new Source(query, "StarWars.graphql");
  const ast = parse(source);
  // Use our compile() function instead of validate
  const compiled = GQL.compile(ast);
  if ("errors" in compiled) {
    return compiled.errors;
  }
  return [];
}

describe("Star Wars Validation Tests", () => {
  describe("Basic Queries", () => {
    it("Validates a complex but valid query", () => {
      const query = `
        query NestedQueryWithFragment {
          hero {
            ...NameAndAppearances
            friends {
              ...NameAndAppearances
              friends {
                ...NameAndAppearances
              }
            }
          }
        }

        fragment NameAndAppearances on Character {
          name
          appearsIn
        }
      `;
      return expect(validationErrors(query)).toHaveLength(0);
    });

    it("Notes that non-existent fields are invalid", () => {
      const query = `
        query HeroSpaceshipQuery {
          hero {
            favoriteSpaceship
          }
        }
      `;
      return expect(validationErrors(query)).not.toHaveLength(0);
    });

    it("Requires fields on objects", () => {
      const query = `
        query HeroNoFieldsQuery {
          hero
        }
      `;
      return expect(validationErrors(query)).not.toHaveLength(0);
    });

    it("Disallows fields on scalars", () => {
      const query = `
        query HeroFieldsOnScalarQuery {
          hero {
            name {
              firstCharacterOfName
            }
          }
        }
      `;
      return expect(validationErrors(query)).not.toHaveLength(0);
    });

    it("Disallows object fields on interfaces", () => {
      const query = `
        query DroidFieldOnCharacter {
          hero {
            name
            primaryFunction
          }
        }
      `;
      return expect(validationErrors(query)).not.toHaveLength(0);
    });

    it("Allows object fields in fragments", () => {
      const query = `
        query DroidFieldInFragment {
          hero {
            name
            ...DroidFields
          }
        }

        fragment DroidFields on Droid {
          primaryFunction
        }
      `;
      return expect(validationErrors(query)).toHaveLength(0);
    });

    it("Allows object fields in inline fragments", () => {
      const query = `
        query DroidFieldInFragment {
          hero {
            name
            ... on Droid {
              primaryFunction
            }
          }
        }
      `;
      return expect(validationErrors(query)).toHaveLength(0);
    });
  });
});
