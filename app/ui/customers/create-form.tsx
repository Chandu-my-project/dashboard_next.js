'use client'

import { CustomerField } from '@/app/lib/definitions';
import { useActionState } from 'react';
import Link from 'next/link';
import {
  EnvelopeIcon,
  UserCircleIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/app/ui/button';
import {createCustomer} from '@/app/lib/action';
import { State2 } from '@/app/lib/action';

export default function Form({ customers }: { customers: CustomerField[] }) {
  const initialState: State2 = { message: null, errors: {} };
  const [state, formAction] = useActionState(createCustomer, initialState);
  console.log(state);
  return (
    <form action={formAction} >
      <div className="rounded-md bg-gray-50 p-4 md:p-6">
      
        <div className="mb-4">
          <label htmlFor="name" className="mb-2 block text-sm font-medium">
            Customer Name
          </label>
        <div className="relative mt-2 rounded-md">
            <div className="relative">
              <input
                id="name"
                name="name"
                placeholder="Enter Customer Name"
                aria-describedby="name-error"
                className="peer block w-full rounded-md border border-gray-200 py-2 pl-10 text-sm outline-2 placeholder:text-gray-500"
              />
              <UserCircleIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
            </div>
          </div>
         <div id="name-error" aria-live="polite" aria-atomic="true">
         {state.errors?.customerName &&
          state.errors.customerName.map((error: string) => (
            <p className="mt-2 text-sm text-red-500" key={error}>
              {error}
            </p>
          ))}
      </div>
        </div>

  
        <div className="mb-4">
          <label htmlFor="email" className="mb-2 block text-sm font-medium">
            Customer email
          </label>
          <div className="relative mt-2 rounded-md">
            <div className="relative">
              <input
                id="email"
                name="email"
                type="email"
                placeholder="Enter Customer email"
                aria-describedby="email-error"
                className="peer block w-full rounded-md border border-gray-200 py-2 pl-10 text-sm outline-2 placeholder:text-gray-500"
              />
              <EnvelopeIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
            </div>
          </div>
            <div id="email-error" aria-live="polite" aria-atomic="true">
         {state.errors?.customerEmail &&
          state.errors.customerEmail.map((error: string) => (
            <p className="mt-2 text-sm text-red-500" key={error}>
              {error}
            </p>
          ))}
      </div>
        </div>

         <div className="mb-4">
          <label htmlFor="image" className="mb-2 block text-sm font-medium">
            Select an image
          </label>
          <div className="relative mt-2 rounded-md">
            <div className="relative">
              <input
                id="image"
                name="image"
                type="file"
                accept="image/*" 
                placeholder="Select an image"
                aria-describedby="image-error"
                className="peer block w-full rounded-md border border-gray-200 py-2 pl-10 text-sm outline-2 placeholder:text-gray-500"
              />
              <PhotoIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
            </div>
          </div>
            <div id="image-error" aria-live="polite" aria-atomic="true">
         {state.errors?.customerImage &&
          state.errors.customerImage.map((error: string) => (
            <p className="mt-2 text-sm text-red-500" key={error}>
              {error}
            </p>
          ))}
      </div>
        </div>
         <div aria-live="polite" aria-atomic="true">
           {state.message &&
            <p className="mt-2 text-sm text-red-500" >
              {state.message}
            </p>
         }
        </div>
    
      </div>
      <div className="mt-6 flex justify-end gap-4">
        <Link
          href="/dashboard/customers"
          className="flex h-10 items-center rounded-lg bg-gray-100 px-4 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200"
        >
          Cancel
        </Link>
        <Button type="submit">Create Customer</Button>
      </div>
    </form>
  );
}
