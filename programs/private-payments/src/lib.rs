use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{Mint, Token, TokenAccount};
use ephemeral_rollups_sdk::anchor::{commit, delegate, ephemeral};
use ephemeral_rollups_sdk::cpi::DelegateConfig;
use ephemeral_rollups_sdk::ephem::commit_and_undelegate_accounts;
use magicblock_permission_client::instructions::{
    CreateGroupCpiBuilder, CreatePermissionCpiBuilder,
};

declare_id!("EnhkomtzKms55jXi3ijn9XsMKYpMT4BJjmbuDQmPo3YS");

pub const DEPOSIT_PDA_SEED: &[u8] = b"deposit";

#[ephemeral]
#[program]
pub mod private_payments {
    use anchor_spl::token::{transfer_checked, TransferChecked};

    use super::*;

    /// Initializes a deposit account for a user and token mint if it does not exist.
    ///
    /// Sets up a new deposit account with zero balance for the user and token mint.
    pub fn initialize_deposit(ctx: Context<InitializeDeposit>) -> Result<()> {
        let deposit = &mut ctx.accounts.deposit;
        deposit.set_inner(Deposit {
            user: ctx.accounts.user.key(),
            token_mint: ctx.accounts.token_mint.key(),
            amount: 0,
        });

        Ok(())
    }

    /// Modifies the balance of a user's deposit account by transferring tokens in or out.
    ///
    /// If `args.increase` is true, tokens are transferred from the user's token account to the deposit account.
    /// If false, tokens are transferred from the deposit account back to the user's token account.
    pub fn modify_balance(ctx: Context<ModifyDeposit>, args: ModifyDepositArgs) -> Result<()> {
        let deposit = &mut ctx.accounts.deposit;

        if args.increase {
            transfer_checked(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    TransferChecked {
                        from: ctx.accounts.user_token_account.to_account_info(),
                        mint: ctx.accounts.token_mint.to_account_info(),
                        to: ctx.accounts.deposit_token_account.to_account_info(),
                        authority: ctx.accounts.user.to_account_info(),
                    },
                ),
                args.amount,
                ctx.accounts.token_mint.decimals,
            )?;
            deposit.amount += args.amount;
        } else {
            let seeds = [
                DEPOSIT_PDA_SEED,
                &ctx.accounts.user.key().to_bytes(),
                &ctx.accounts.token_mint.key().to_bytes(),
                &[ctx.bumps.deposit]
            ];
            let signer_seeds = &[&seeds[..]];
            transfer_checked(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    TransferChecked {
                        from: ctx.accounts.deposit_token_account.to_account_info(),
                        mint: ctx.accounts.token_mint.to_account_info(),
                        to: ctx.accounts.user_token_account.to_account_info(),
                        authority: deposit.to_account_info(),
                    },
                    signer_seeds,
                ),
                args.amount,
                ctx.accounts.token_mint.decimals,
            )?;
            deposit.amount -= args.amount;
        }

        Ok(())
    }

    /// Transfers a specified amount from one user's deposit account to another's for the same token mint.
    ///
    /// Only updates the internal accounting; does not move actual tokens.
    pub fn transfer_deposit(ctx: Context<TransferDeposit>, amount: u64) -> Result<()> {
        let source_deposit = &mut ctx.accounts.source_deposit;
        let destination_deposit = &mut ctx.accounts.destination_deposit;

        source_deposit.amount -= amount;
        destination_deposit.amount += amount;

        Ok(())
    }

    /// Creates a permission group and permission for a deposit account using the external permission program.
    ///
    /// Calls out to the permission program to create a group and permission for the deposit account.
    pub fn create_permission(ctx: Context<CreatePermission>, id: Pubkey) -> Result<()> {
        let CreatePermission {
            payer,
            permission,
            permission_program,
            group,
            deposit,
            user,
            system_program,
        } = ctx.accounts;

        CreateGroupCpiBuilder::new(&permission_program)
            .group(&group)
            .id(id)
            .members(vec![user.key()])
            .payer(&payer)
            .system_program(system_program)
            .invoke()?;

        CreatePermissionCpiBuilder::new(&permission_program)
            .permission(&permission)
            .group(&group)
            .delegated_account(&deposit.to_account_info())
            .owner(&deposit.to_account_info())
            .payer(&payer)
            .system_program(system_program)
            .invoke_signed(&[&[
                DEPOSIT_PDA_SEED,
                user.key().as_ref(),
                deposit.token_mint.as_ref(),
                &[ctx.bumps.deposit],
            ]])?;

        Ok(())
    }

    /// Delegates the deposit account to the ephemeral rollups delegate program.
    ///
    /// Uses the ephemeral rollups delegate CPI to delegate the deposit account.
    pub fn delegate(ctx: Context<DelegateDeposit>, user: Pubkey, token_mint: Pubkey) -> Result<()> {
        ctx.accounts.delegate_deposit(
            &ctx.accounts.payer,
            &[DEPOSIT_PDA_SEED, user.as_ref(), token_mint.as_ref()],
            DelegateConfig::default(),
        )?;
        Ok(())
    }

    /// Commits and undelegates the deposit account from the ephemeral rollups program.
    ///
    /// Uses the ephemeral rollups SDK to commit and undelegate the deposit account.
    pub fn undelegate(ctx: Context<UndelegateDeposit>) -> Result<()> {
        commit_and_undelegate_accounts(
            &ctx.accounts.payer,
            vec![&ctx.accounts.deposit.to_account_info()],
            &ctx.accounts.magic_context,
            &ctx.accounts.magic_program,
        )?;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeDeposit<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: Anyone can initialize the deposit
    pub user: UncheckedAccount<'info>,
    #[account(
        init_if_needed,
        payer = payer,
        space = 8 + Deposit::INIT_SPACE,
        seeds = [DEPOSIT_PDA_SEED, user.key().as_ref(), token_mint.key().as_ref()],
        bump
    )]
    pub deposit: Account<'info, Deposit>,
    pub token_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct ModifyDepositArgs {
    pub amount: u64,
    pub increase: bool,
}

#[derive(Accounts)]
pub struct ModifyDeposit<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub user: Signer<'info>,
    #[account(
        mut,
        seeds = [DEPOSIT_PDA_SEED, deposit.user.as_ref(), deposit.token_mint.as_ref()],
        bump,
        has_one = user,
        has_one = token_mint,
    )]
    pub deposit: Account<'info, Deposit>,
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = token_mint,
        associated_token::authority = user,
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = token_mint,
        associated_token::authority = deposit,
    )]
    pub deposit_token_account: Account<'info, TokenAccount>,
    pub token_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct TransferDeposit<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        mut,
        seeds = [
            DEPOSIT_PDA_SEED,
            source_deposit.user.as_ref(),
            source_deposit.token_mint.as_ref()
        ],
        bump,
        has_one = user,
        has_one = token_mint,
    )]
    pub source_deposit: Account<'info, Deposit>,
    #[account(
        mut,
        seeds = [
            DEPOSIT_PDA_SEED, 
            destination_deposit.user.as_ref(), 
            destination_deposit.token_mint.as_ref()
        ],
        bump,
        has_one = token_mint,
    )]
    pub destination_deposit: Account<'info, Deposit>,
    pub token_mint: Account<'info, Mint>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreatePermission<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: Anyone can create the permission
    pub user: UncheckedAccount<'info>,
    #[account(
        seeds = [DEPOSIT_PDA_SEED, user.key().as_ref(), deposit.token_mint.as_ref()],
        bump
    )]
    pub deposit: Account<'info, Deposit>,
    /// CHECK: Checked by the permission program
    #[account(mut)]
    pub permission: UncheckedAccount<'info>,
    /// CHECK: Checked by the permission program
    #[account(mut)]
    pub group: UncheckedAccount<'info>,
    /// CHECK: Checked by the permission program
    pub permission_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[delegate]
#[derive(Accounts)]
#[instruction(user: Pubkey, token_mint: Pubkey)]
pub struct DelegateDeposit<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: Checked counter accountby the delegate program
    #[account(
        mut,
        del,
        seeds = [DEPOSIT_PDA_SEED, user.as_ref(), token_mint.as_ref()],
        bump,
    )]
    pub deposit: AccountInfo<'info>,
}

#[commit]
#[derive(Accounts)]
pub struct UndelegateDeposit<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        mut,
        seeds = [DEPOSIT_PDA_SEED, user.key().as_ref(), deposit.token_mint.as_ref()],
        bump
    )]
    pub deposit: Account<'info, Deposit>,
}

/// A deposit account for a user and token mint.
#[account]
#[derive(InitSpace)]
pub struct Deposit {
    pub user: Pubkey,
    pub token_mint: Pubkey,
    pub amount: u64,
}
