const { getNamedAccounts, ethers } = require("hardhat");
const { getWeth, AMOUNT } = require("../scripts/getWeth");

async function main() {
  await getWeth();
  const { deployer } = await getNamedAccounts();

  //lending pool addresses provider 0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5
  const lendingPool = await getLendingPool(deployer);
  console.log(`lending pool address- ${lendingPool.address}`);

  //deposit
  const wethAdress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  //approve
  await approveERC20(wethAdress, lendingPool.address, AMOUNT, deployer);
  console.log("Depositing..");
  await lendingPool.deposit(wethAdress, AMOUNT, deployer, 0);
  console.log("Deposited");
  //time to borrow
  //how much you have deposited in collateral, how much you have borrowed, how much more you can borrow
  let { totalDebtETH, availableBorrowsETH } = await getBorrowedUserData(
    lendingPool,
    deployer
  );
  const daiPrice = await getDaiPrice();
  const amountDaiToBorrow =
    availableBorrowsETH.toString() * 0.95 * (1 / daiPrice.toNumber());
  console.log(`You can borrow ${amountDaiToBorrow} Dai`);
  const amountDaiToBorrowWei = ethers.utils.parseEther(
    amountDaiToBorrow.toString()
  );
  const daiTokenAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
  await borrowDai(daiTokenAddress, lendingPool, amountDaiToBorrowWei, deployer);
  await getBorrowedUserData(lendingPool, deployer);
  await repay(amountDaiToBorrowWei, daiTokenAddress, lendingPool, deployer);
  await getBorrowedUserData(lendingPool, deployer);
}

async function repay(amount, daiAddress, lendingPool, account) {
  await approveERC20(daiAddress, lendingPool.address, amount, account);
  const repaytx = await lendingPool.repay(daiAddress, amount, 1, account);
  await repaytx.wait(1);
  console.log("Repaid!");
}

async function borrowDai(
  wethAddress,
  lendingPool,
  amountDaiToBorrowWei,
  account
) {
  const borrowtx = await lendingPool.borrow(
    wethAddress,
    amountDaiToBorrowWei,
    1,
    0,
    account
  );

  await borrowtx.wait(1);
  console.log("You borrowed!");
}

async function getDaiPrice() {
  const daiEthPriceFeed = await ethers.getContractAt(
    "AggregatorV3Interface",
    "0x773616E4d11A78F511299002da57A0a94577F1f4"
  );
  const price = (await daiEthPriceFeed.latestRoundData())[1];
  console.log(`Dai price is ${price.toString()}`);
  return price;
}

async function getBorrowedUserData(lendingPool, account) {
  const { totalCollateralETH, totalDebtETH, availableBorrowsETH } =
    await lendingPool.getUserAccountData(account);
  console.log(`you have ${totalCollateralETH} worth of ETH deposited`);
  console.log(`you have ${totalDebtETH} worth of ETH borrowed`);
  console.log(`you have ${availableBorrowsETH} worth of eth`);
  return { totalDebtETH, availableBorrowsETH };
}

async function getLendingPool(account) {
  const lendingPoolAddressesProvider = await ethers.getContractAt(
    "ILendingPoolAddressesProvider",
    "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5",
    account
  );
  const lendingPoolAddress =
    await lendingPoolAddressesProvider.getLendingPool();
  const lendingPool = await ethers.getContractAt(
    "ILendingPool",
    lendingPoolAddress,
    account
  );
  return lendingPool;
}
async function approveERC20(
  erc20Address,
  spenderAddress,
  amountToSpend,
  account
) {
  const erc20Token = await ethers.getContractAt(
    "IERC20",
    erc20Address,
    account
  );
  const tx = await erc20Token.approve(spenderAddress, amountToSpend);
  await tx.wait(1);
  console.log("Approved!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
