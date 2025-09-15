/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/private_payments.json`.
 */
export type PrivatePayments = {
  "address": "EnhkomtzKms55jXi3ijn9XsMKYpMT4BJjmbuDQmPo3YS",
  "metadata": {
    "name": "privatePayments",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "createPermission",
      "docs": [
        "Creates a permission group and permission for a deposit account using the external permission program.",
        "",
        "Calls out to the permission program to create a group and permission for the deposit account."
      ],
      "discriminator": [
        190,
        182,
        26,
        164,
        156,
        221,
        8,
        0
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "user"
        },
        {
          "name": "deposit",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  112,
                  111,
                  115,
                  105,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "deposit.token_mint",
                "account": "deposit"
              }
            ]
          }
        },
        {
          "name": "permission",
          "writable": true
        },
        {
          "name": "group",
          "writable": true
        },
        {
          "name": "permissionProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "id",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "delegate",
      "docs": [
        "Delegates the deposit account to the ephemeral rollups delegate program.",
        "",
        "Uses the ephemeral rollups delegate CPI to delegate the deposit account."
      ],
      "discriminator": [
        90,
        147,
        75,
        178,
        85,
        88,
        4,
        137
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "validator",
          "optional": true
        },
        {
          "name": "bufferDeposit",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  117,
                  102,
                  102,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "deposit"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
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
                55
              ]
            }
          }
        },
        {
          "name": "delegationRecordDeposit",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "deposit"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "delegationMetadataDeposit",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
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
                  97
                ]
              },
              {
                "kind": "account",
                "path": "deposit"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "deposit",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  112,
                  111,
                  115,
                  105,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "user"
              },
              {
                "kind": "arg",
                "path": "tokenMint"
              }
            ]
          }
        },
        {
          "name": "ownerProgram",
          "address": "EnhkomtzKms55jXi3ijn9XsMKYpMT4BJjmbuDQmPo3YS"
        },
        {
          "name": "delegationProgram",
          "address": "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "user",
          "type": "pubkey"
        },
        {
          "name": "tokenMint",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "initializeDeposit",
      "docs": [
        "Initializes a deposit account for a user and token mint if it does not exist.",
        "",
        "Sets up a new deposit account with zero balance for the user and token mint."
      ],
      "discriminator": [
        171,
        65,
        93,
        225,
        61,
        109,
        31,
        227
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "user"
        },
        {
          "name": "deposit",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  112,
                  111,
                  115,
                  105,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "tokenMint"
              }
            ]
          }
        },
        {
          "name": "tokenMint"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "modifyBalance",
      "docs": [
        "Modifies the balance of a user's deposit account by transferring tokens in or out.",
        "",
        "If `args.increase` is true, tokens are transferred from the user's token account to the deposit account.",
        "If false, tokens are transferred from the deposit account back to the user's token account."
      ],
      "discriminator": [
        148,
        232,
        7,
        240,
        55,
        51,
        121,
        115
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "user",
          "signer": true,
          "relations": [
            "deposit"
          ]
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "deposit.token_mint",
                "account": "deposit"
              }
            ]
          }
        },
        {
          "name": "deposit",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  112,
                  111,
                  115,
                  105,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "deposit.user",
                "account": "deposit"
              },
              {
                "kind": "account",
                "path": "deposit.token_mint",
                "account": "deposit"
              }
            ]
          }
        },
        {
          "name": "userTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "const",
                "value": [
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
                  169
                ]
              },
              {
                "kind": "account",
                "path": "tokenMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
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
                89
              ]
            }
          }
        },
        {
          "name": "vaultTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "vault"
              },
              {
                "kind": "const",
                "value": [
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
                  169
                ]
              },
              {
                "kind": "account",
                "path": "tokenMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
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
                89
              ]
            }
          }
        },
        {
          "name": "tokenMint",
          "relations": [
            "deposit"
          ]
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "modifyDepositArgs"
            }
          }
        }
      ]
    },
    {
      "name": "processUndelegation",
      "discriminator": [
        196,
        28,
        41,
        206,
        48,
        37,
        51,
        167
      ],
      "accounts": [
        {
          "name": "baseAccount",
          "writable": true
        },
        {
          "name": "buffer"
        },
        {
          "name": "payer",
          "writable": true
        },
        {
          "name": "systemProgram"
        }
      ],
      "args": [
        {
          "name": "accountSeeds",
          "type": {
            "vec": "bytes"
          }
        }
      ]
    },
    {
      "name": "transferDeposit",
      "docs": [
        "Transfers a specified amount from one user's deposit account to another's for the same token mint.",
        "",
        "Only updates the internal accounting; does not move actual tokens."
      ],
      "discriminator": [
        20,
        20,
        147,
        223,
        41,
        63,
        204,
        111
      ],
      "accounts": [
        {
          "name": "user",
          "relations": [
            "sourceDeposit"
          ]
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "sessionToken",
          "optional": true
        },
        {
          "name": "sourceDeposit",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  112,
                  111,
                  115,
                  105,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "source_deposit.user",
                "account": "deposit"
              },
              {
                "kind": "account",
                "path": "source_deposit.token_mint",
                "account": "deposit"
              }
            ]
          }
        },
        {
          "name": "destinationDeposit",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  112,
                  111,
                  115,
                  105,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "destination_deposit.user",
                "account": "deposit"
              },
              {
                "kind": "account",
                "path": "destination_deposit.token_mint",
                "account": "deposit"
              }
            ]
          }
        },
        {
          "name": "tokenMint",
          "relations": [
            "sourceDeposit",
            "destinationDeposit"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "undelegate",
      "docs": [
        "Commits and undelegates the deposit account from the ephemeral rollups program.",
        "",
        "Uses the ephemeral rollups SDK to commit and undelegate the deposit account."
      ],
      "discriminator": [
        131,
        148,
        180,
        198,
        91,
        104,
        42,
        238
      ],
      "accounts": [
        {
          "name": "user"
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "sessionToken",
          "optional": true
        },
        {
          "name": "deposit",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  112,
                  111,
                  115,
                  105,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "deposit.token_mint",
                "account": "deposit"
              }
            ]
          }
        },
        {
          "name": "magicProgram",
          "address": "Magic11111111111111111111111111111111111111"
        },
        {
          "name": "magicContext",
          "writable": true,
          "address": "MagicContext1111111111111111111111111111111"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "deposit",
      "discriminator": [
        148,
        146,
        121,
        66,
        207,
        173,
        21,
        227
      ]
    },
    {
      "name": "sessionToken",
      "discriminator": [
        233,
        4,
        115,
        14,
        46,
        21,
        1,
        15
      ]
    },
    {
      "name": "vault",
      "discriminator": [
        211,
        8,
        232,
        43,
        2,
        152,
        117,
        119
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "unauthorized",
      "msg": "unauthorized"
    }
  ],
  "types": [
    {
      "name": "deposit",
      "docs": [
        "A deposit account for a user and token mint."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "tokenMint",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "modifyDepositArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "increase",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "sessionToken",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "targetProgram",
            "type": "pubkey"
          },
          {
            "name": "sessionSigner",
            "type": "pubkey"
          },
          {
            "name": "validUntil",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "vault",
      "docs": [
        "A vault storing deposited tokens.",
        "Has a dummy field because Anchor requires it."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "dummy",
            "type": "u8"
          }
        ]
      }
    }
  ]
};
