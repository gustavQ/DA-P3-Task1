const web3 = require("@solana/web3.js");
const spltoken = require("@solana/spl-token");
const homedir = require('os').homedir();
const wallet_path = require('path').join(homedir, '.config/solana/wallet.json');

const conn = new web3.Connection(web3.clusterApiUrl("devnet"), "confirmed");

const toPubkey = new web3.PublicKey("tUaVzWiSNrrY2NSVKroE3883vnBfn8SMrLM2UxA2vDy");

(async () => {

  let wallet = null;
  
  try {
    const keypair = require(wallet_path);
    wallet = web3.Keypair.fromSecretKey(Uint8Array.from(keypair));
  } catch(e) {
    wallet = web3.Keypair.generate();
  }

  console.log(`from pubKey: ${wallet.publicKey.toBase58()}`);
  console.log(`to pubKey: ${toPubkey.toBase58()}`);

  let balance = await conn.getBalance(wallet.publicKey);
  console.log(`from SOL balance: ${balance / web3.LAMPORTS_PER_SOL}`);
  
  const tokenAccount = await conn.getTokenAccountsByOwner(
    wallet.publicKey,
    {
      programId: spltoken.TOKEN_PROGRAM_ID
    }
  );
  
  const tokenAccount_pubkey = tokenAccount.value[0].pubkey;
  console.log(`token account pubkey: ${tokenAccount_pubkey.toBase58()}`);
  const accountInfo = spltoken.AccountLayout.decode(tokenAccount.value[0].account.data);
  const splToken_address = new web3.PublicKey(accountInfo.mint);
  console.log(`spl token address: ${splToken_address.toBase58()}`);

	const toTokenAccount_pubkey = await spltoken.getOrCreateAssociatedTokenAccount(
		conn,
		wallet,
		splToken_address,
		toPubkey
	);

  console.log(`to Token Account address: ${toTokenAccount_pubkey.address}`);


  const tx = new web3.Transaction().add(
    web3.SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: toPubkey,
      lamports: 0.1 * web3.LAMPORTS_PER_SOL,
    })
  );
  
  const txhash = await web3.sendAndConfirmTransaction(conn, tx, [wallet]);
  console.log(`txhash: ${txhash}`);

  balance = await conn.getBalance(wallet.publicKey);
  console.log(`from SOL balance: ${balance / web3.LAMPORTS_PER_SOL}`);

  console.log(toTokenAccount_pubkey.address)

  const txsplhash = await spltoken.transfer(
		conn,
		wallet,
		tokenAccount_pubkey,
		toTokenAccount_pubkey.address,
		wallet,
		web3.LAMPORTS_PER_SOL * 0.1
	);

   console.log(`txsplhash: ${txsplhash}`);

  const tokenAccountBalance = await conn.getTokenAccountBalance(toTokenAccount_pubkey.address);
  console.log(`decimals: ${tokenAccountBalance.value.decimals}, amount: ${tokenAccountBalance.value.amount / web3.LAMPORTS_PER_SOL}`);
})();
