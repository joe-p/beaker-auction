import MyAlgoConnect from '@randlabs/myalgo-connect'
import algosdk from 'algosdk'
import { Auction } from './beaker/auction_client'
import { MyAlgoSession } from './wallets/myalgo'

const myAlgo = new MyAlgoSession()
const algodClient = new algosdk.Algodv2('', 'https://testnet-api.algonode.cloud', '')

const buttonIds = ['create', 'connect', 'start', 'bid']
const buttons: { [key: string]: HTMLButtonElement } = {}
const accountsMenu = document.getElementById('accounts') as HTMLSelectElement
const amountInput = document.getElementById('amount') as HTMLInputElement

let appId: number

buttonIds.forEach(id => {
  buttons[id] = document.getElementById(id) as HTMLButtonElement
})

async function signer (txns: algosdk.Transaction[]) {
  const sTxns = await myAlgo.signTxns(txns)
  return sTxns.map(s => s.blob)
}

buttons.connect.onclick = async () => {
  await myAlgo.getAccounts()
  buttons.create.disabled = false
  myAlgo.accounts.forEach(account => {
    accountsMenu.add(new Option(`${account.name} - ${account.address}`, account.address))
  })
}

buttons.create.onclick = async () => {
  const auctionApp = new Auction({
    client: algodClient,
    signer,
    sender: accountsMenu.selectedOptions[0].value
  })

  const [createdAppId, appAddr, txId] = await auctionApp.create()
  appId = createdAppId
  document.getElementById('status').innerHTML = `App created with id ${appId} and address ${appAddr} in tx ${txId}. See it <a href='https://testnet.algoexplorer.io/application/${appId}'>here</a>`
  buttons.start.disabled = false
  buttons.create.disabled = true
}

buttons.start.onclick = async () => {
  const auctionApp = new Auction({
    client: algodClient,
    signer,
    sender: accountsMenu.selectedOptions[0].value,
    appId
  })

  const payment = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    suggestedParams: await algodClient.getTransactionParams().do(),
    amount: 100_000,
    from: accountsMenu.selectedOptions[0].value,
    to: algosdk.getApplicationAddress(appId)
  })

  await auctionApp.start_auction({
    payment,
    starting_price: BigInt(amountInput.valueAsNumber),
    length: BigInt(36_000)
  })

  buttons.bid.disabled = false
  buttons.start.disabled = true
}

buttons.bid.onclick = async () => {
    const auctionApp = new Auction({
      client: algodClient,
      signer,
      sender: accountsMenu.selectedOptions[0].value,
      appId
    })
  
    const payment = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      suggestedParams: await algodClient.getTransactionParams().do(),
      amount: amountInput.valueAsNumber,
      from: accountsMenu.selectedOptions[0].value,
      to: algosdk.getApplicationAddress(appId)
    })
  
    await auctionApp.bid({
      payment,
    })
  }
