function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const users = [
  {
    id: "1",
    name: "Jane",
    age: 17,
    friendIds: ["2", "3", "4"],
    bestFriendId: "2",
  },
  { id: "2", name: "John", age: 16, friendIds: ["1", "4"], bestFriendId: "1" },
  {
    id: "3",
    name: "Alex",
    age: 18,
    friendIds: ["1", "2", "4"],
    bestFriendId: "4",
  },
  {
    id: "4",
    name: "Jessie",
    age: 21,
    friendIds: ["2", "3"],
    bestFriendId: "3",
  },
  { id: "5", name: "Billy", age: 19, friendIds: [], bestFriendId: "" },
];

export const getUser = async (id) => {
  console.log(`get user: ${id}`);
  // Simulate delay in database queries
  await sleep(100);
  return users.find((u) => u.id === id);
};

export const getBatchUsers = async (ids) => {
  return await Promise.all(ids.map((id) => getUser(id)));
};
