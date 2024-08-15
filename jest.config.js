module.exports = {
   coverageDirectory: "converage~~",
   collectCoverageFrom: [
      "src/**/*.{js,jsx,ts,tsx}",
      "!src/**/*.d.ts",
      "!**/node_modules/**",
   ],
   testPathIgnorePatterns: ["/node_modules/", "/.next/", "/*~~/"],
   transform: {
      "^.+\\.(ts|tsx)$": "ts-jest",
   },
   testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.(ts|tsx|js)$",
   moduleFileExtensions: ["ts", "tsx", "js", "json"],
};
