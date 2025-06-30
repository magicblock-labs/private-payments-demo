/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/private_payments.json`.
 */
export type PrivatePayments = {
  address: 'EnhkomtzKms55jXi3ijn9XsMKYpMT4BJjmbuDQmPo3YS';
  metadata: {
    name: 'privatePayments';
    version: '0.1.0';
    spec: '0.1.0';
    description: 'Created with Anchor';
  };
  instructions: [
    {
      name: 'createPermission';
      discriminator: [190, 182, 26, 164, 156, 221, 8, 0];
      accounts: [
        {
          name: 'payer';
          writable: true;
          signer: true;
        },
        {
          name: 'user';
        },
        {
          name: 'deposit';
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [100, 101, 112, 111, 115, 105, 116];
              },
              {
                kind: 'account';
                path: 'user';
              },
              {
                kind: 'account';
                path: 'deposit.token_mint';
                account: 'deposit';
              },
            ];
          };
        },
        {
          name: 'permission';
          writable: true;
        },
        {
          name: 'group';
          writable: true;
        },
        {
          name: 'permissionProgram';
        },
        {
          name: 'systemProgram';
          address: '11111111111111111111111111111111';
        },
      ];
      args: [
        {
          name: 'id';
          type: 'pubkey';
        },
      ];
    },
    {
      name: 'delegate';
      discriminator: [90, 147, 75, 178, 85, 88, 4, 137];
      accounts: [
        {
          name: 'payer';
          writable: true;
          signer: true;
        },
        {
          name: 'bufferDeposit';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [98, 117, 102, 102, 101, 114];
              },
              {
                kind: 'account';
                path: 'deposit';
              },
            ];
            program: {
              kind: 'const';
              value: [
                204,
                221,
                38,
                10,
                116,
                212,
                156,
                1,
                120,
                58,
                221,
                86,
                190,
                244,
                82,
                210,
                141,
                180,
                94,
                56,
                227,
                53,
                71,
                16,
                17,
                47,
                238,
                101,
                116,
                142,
                81,
                55,
              ];
            };
          };
        },
        {
          name: 'delegationRecordDeposit';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [100, 101, 108, 101, 103, 97, 116, 105, 111, 110];
              },
              {
                kind: 'account';
                path: 'deposit';
              },
            ];
            program: {
              kind: 'account';
              path: 'delegationProgram';
            };
          };
        },
        {
          name: 'delegationMetadataDeposit';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110,
                  45,
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97,
                ];
              },
              {
                kind: 'account';
                path: 'deposit';
              },
            ];
            program: {
              kind: 'account';
              path: 'delegationProgram';
            };
          };
        },
        {
          name: 'deposit';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [100, 101, 112, 111, 115, 105, 116];
              },
              {
                kind: 'arg';
                path: 'user';
              },
              {
                kind: 'arg';
                path: 'tokenMint';
              },
            ];
          };
        },
        {
          name: 'ownerProgram';
          address: 'EnhkomtzKms55jXi3ijn9XsMKYpMT4BJjmbuDQmPo3YS';
        },
        {
          name: 'delegationProgram';
          address: 'DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh';
        },
        {
          name: 'systemProgram';
          address: '11111111111111111111111111111111';
        },
      ];
      args: [
        {
          name: 'user';
          type: 'pubkey';
        },
        {
          name: 'tokenMint';
          type: 'pubkey';
        },
      ];
    },
    {
      name: 'initializeDeposit';
      discriminator: [171, 65, 93, 225, 61, 109, 31, 227];
      accounts: [
        {
          name: 'payer';
          writable: true;
          signer: true;
        },
        {
          name: 'user';
        },
        {
          name: 'deposit';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [100, 101, 112, 111, 115, 105, 116];
              },
              {
                kind: 'account';
                path: 'user';
              },
              {
                kind: 'account';
                path: 'tokenMint';
              },
            ];
          };
        },
        {
          name: 'tokenMint';
        },
        {
          name: 'tokenProgram';
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
        {
          name: 'systemProgram';
          address: '11111111111111111111111111111111';
        },
      ];
      args: [];
    },
    {
      name: 'modifyBalance';
      discriminator: [148, 232, 7, 240, 55, 51, 121, 115];
      accounts: [
        {
          name: 'payer';
          writable: true;
          signer: true;
        },
        {
          name: 'user';
          signer: true;
          relations: ['deposit'];
        },
        {
          name: 'deposit';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [100, 101, 112, 111, 115, 105, 116];
              },
              {
                kind: 'account';
                path: 'deposit.user';
                account: 'deposit';
              },
              {
                kind: 'account';
                path: 'deposit.token_mint';
                account: 'deposit';
              },
            ];
          };
        },
        {
          name: 'userTokenAccount';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'user';
              },
              {
                kind: 'const';
                value: [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'tokenMint';
              },
            ];
            program: {
              kind: 'const';
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89,
              ];
            };
          };
        },
        {
          name: 'depositTokenAccount';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'deposit';
              },
              {
                kind: 'const';
                value: [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'tokenMint';
              },
            ];
            program: {
              kind: 'const';
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89,
              ];
            };
          };
        },
        {
          name: 'tokenMint';
          relations: ['deposit'];
        },
        {
          name: 'tokenProgram';
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
        {
          name: 'associatedTokenProgram';
          address: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
        },
        {
          name: 'systemProgram';
          address: '11111111111111111111111111111111';
        },
      ];
      args: [
        {
          name: 'args';
          type: {
            defined: {
              name: 'modifyDepositArgs';
            };
          };
        },
      ];
    },
    {
      name: 'processUndelegation';
      discriminator: [196, 28, 41, 206, 48, 37, 51, 167];
      accounts: [
        {
          name: 'baseAccount';
          writable: true;
        },
        {
          name: 'buffer';
        },
        {
          name: 'payer';
          writable: true;
        },
        {
          name: 'systemProgram';
        },
      ];
      args: [
        {
          name: 'accountSeeds';
          type: {
            vec: 'bytes';
          };
        },
      ];
    },
    {
      name: 'transferDeposit';
      discriminator: [20, 20, 147, 223, 41, 63, 204, 111];
      accounts: [
        {
          name: 'user';
          writable: true;
          signer: true;
          relations: ['sourceDeposit'];
        },
        {
          name: 'sourceDeposit';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [100, 101, 112, 111, 115, 105, 116];
              },
              {
                kind: 'account';
                path: 'source_deposit.user';
                account: 'deposit';
              },
              {
                kind: 'account';
                path: 'source_deposit.token_mint';
                account: 'deposit';
              },
            ];
          };
        },
        {
          name: 'destinationDeposit';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [100, 101, 112, 111, 115, 105, 116];
              },
              {
                kind: 'account';
                path: 'destination_deposit.user';
                account: 'deposit';
              },
              {
                kind: 'account';
                path: 'destination_deposit.token_mint';
                account: 'deposit';
              },
            ];
          };
        },
        {
          name: 'tokenMint';
          relations: ['sourceDeposit', 'destinationDeposit'];
        },
        {
          name: 'systemProgram';
          address: '11111111111111111111111111111111';
        },
      ];
      args: [
        {
          name: 'amount';
          type: 'u64';
        },
      ];
    },
    {
      name: 'undelegate';
      discriminator: [131, 148, 180, 198, 91, 104, 42, 238];
      accounts: [
        {
          name: 'payer';
          writable: true;
          signer: true;
        },
        {
          name: 'user';
          writable: true;
          signer: true;
        },
        {
          name: 'deposit';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [100, 101, 112, 111, 115, 105, 116];
              },
              {
                kind: 'account';
                path: 'user';
              },
              {
                kind: 'account';
                path: 'deposit.token_mint';
                account: 'deposit';
              },
            ];
          };
        },
        {
          name: 'magicProgram';
          address: 'Magic11111111111111111111111111111111111111';
        },
        {
          name: 'magicContext';
          writable: true;
          address: 'MagicContext1111111111111111111111111111111';
        },
      ];
      args: [];
    },
  ];
  accounts: [
    {
      name: 'deposit';
      discriminator: [148, 146, 121, 66, 207, 173, 21, 227];
    },
  ];
  types: [
    {
      name: 'deposit';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'user';
            type: 'pubkey';
          },
          {
            name: 'tokenMint';
            type: 'pubkey';
          },
          {
            name: 'amount';
            type: 'u64';
          },
        ];
      };
    },
    {
      name: 'modifyDepositArgs';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'amount';
            type: 'u64';
          },
          {
            name: 'increase';
            type: 'bool';
          },
        ];
      };
    },
  ];
};
