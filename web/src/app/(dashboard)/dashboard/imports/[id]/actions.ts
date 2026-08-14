'use server'
import { revalidatePath } from 'next/cache'
import { importOrders } from '@/lib/api'
import { requireUser } from '@/lib/session'

export async function acceptAgreementAction(id:string){const {token}=await requireUser();await importOrders.acceptAgreement(token,id);revalidatePath(`/dashboard/imports/${id}`)}
export async function paymentProofAction(id:string,paymentId:string,_prev:any,data:FormData){try{const {token}=await requireUser();await importOrders.submitPaymentProof(token,id,paymentId,data);revalidatePath(`/dashboard/imports/${id}`);return{ok:true}}catch(e:any){return{error:e.message}}}
