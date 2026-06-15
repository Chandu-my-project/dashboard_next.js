'use server';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
import { z } from 'zod';
import postgres from 'postgres'
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import fs from 'fs/promises';
import path from 'path';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({ invalid_type_error: 'Please select a customer.',}),
  amount: z.coerce.number().gt(0, { message: 'Please enter an amount greater than $0.' }),
  status: z.enum(['pending', 'paid'] , {invalid_type_error: 'Please select an invoice status.', }),
  date: z.string(),
});
const CoreCustomerSchema = z.object({
  customerName: z.string().min(1, { message: 'Please enter a customer name.' }),
  customerEmail: z.string().email({ message: 'Please enter a valid customer email.' }),
});

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

// 2. The Create Schema (Image is STRICTLY REQUIRED)
const CreateCustomer = CoreCustomerSchema.extend({
  customerImage: z
    .instanceof(File, { message: 'Please select an image.' })
    .refine((file) => file.size > 0, 'Image is required.')
    .refine((file) => file.size <= MAX_FILE_SIZE, 'Max image size is 5MB.')
    .refine((file) => ACCEPTED_IMAGE_TYPES.includes(file.type), 'Only .jpg, .jpeg, .png and .webp formats are supported.')
});

// 3. The Update Schema (Image is OPTIONAL / ALLOWS SIZE 0)
const UpdateCustomerSchema = CoreCustomerSchema.extend({
  customerImage: z
    .instanceof(File)
    .refine((file) => file.size === 0 || file.size <= MAX_FILE_SIZE, 'Max image size is 5MB.')
    .refine((file) => file.size === 0 || ACCEPTED_IMAGE_TYPES.includes(file.type), 'Only .jpg, .jpeg, .png and .webp formats are supported.')
});



// Use Zod to update the expected types
const CreateInvoice = FormSchema.omit({ id: true, date: true });
const UpdateInvoice = FormSchema.omit({ id: true, date: true });




export type State2 = {
  errors?: {
    customerName?: string[];
    customerEmail?: string[];
    customerImage?: string[];
  };
  message?: string | null;
};

export async function createCustomer(prevState: State2, formData: FormData) {
const imageFile = formData.get('image');
 const validatedFields  = CreateCustomer.safeParse({
    customerName: formData.get('name'),
    customerEmail: formData.get('email'),
    customerImage: imageFile,
  });

   // If form validation fails, return errors early. Otherwise, continue.
  if (!validatedFields.success) {
    console.log(validatedFields);
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Customer.',
    };
  }

   const { customerName, customerEmail, customerImage } = validatedFields.data;
    // Insert data into the database
  try {
     // 1. Create a unique filename to prevent overwriting existing files
    const uniqueFilename = `${Date.now()}-${customerImage.name}`;
    
    // 2. Define the absolute physical path on your server machine
    const physicalPath = path.join(process.cwd(), 'public', 'customers', uniqueFilename);
    
    // 3. Define the web-accessible URL path for the database string
    const dbImagePath = `/customers/${uniqueFilename}`;

    // 4. Convert the browser File object into a node Buffer
    const arrayBuffer = await customerImage.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 5. Write the physical file to the disk
    await fs.writeFile(physicalPath, buffer);
    const existingCustomers = await sql`
  SELECT name, email 
  FROM customers 
  WHERE name = ${customerName} OR email = ${customerEmail}
`;
  if (existingCustomers.length > 0) {
  return {
    errors: {}, // Keep the structure matching State2
    message: 'Customer already exists, please create a new customer or edit the existing customer.',
  };
  }

  await sql`
      INSERT INTO customers (name, email, image_url)
      VALUES (${customerName}, ${customerEmail}, ${dbImagePath})
    `;
  } catch (error) {
    // If a database error occurs, return a more specific error.
    return {
      message: 'Database Error: Failed to Create Customer.',
    };
  }
 
  // Revalidate the cache for the customer page and redirect the user.
  revalidatePath('/dashboard/customers');
  redirect('/dashboard/customers');
}



export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

export default async function createInvoice(prevState: State, formData : FormData) {


  // Validate form using Zod
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
 
  // If form validation fails, return errors early. Otherwise, continue.
  if (!validatedFields.success) {
    console.log(validatedFields);
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Invoice.',
    };
  }
 
  // Prepare data for insertion into the database
  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;
  const date = new Date().toISOString().split('T')[0];
  


  // Insert data into the database
  try {
    await sql`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;
  } catch (error) {
    // If a database error occurs, return a more specific error.
    return {
      message: 'Database Error: Failed to Create Invoice.',
    };
  }
 
  // Revalidate the cache for the invoices page and redirect the user.
  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}




 
export async function updateInvoice( id: string,  prevState: State,  formData: FormData,) {

   const validatedFields = UpdateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
 
    // If form validation fails, return errors early. Otherwise, continue.
  if (!validatedFields.success) {
    console.log(validatedFields);
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to update Invoice.',
    };
  }
   // Prepare data for insertion into the database
  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;
  try {
    await sql`
    UPDATE invoices
    SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
    WHERE id = ${id}
  `;
  } catch (error) {
    console.error(error);
    return {
      message: 'Database Error: Failed to Update Invoice.',
    };
  
  }
  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

export async function updateCustomer(id: string, prevState: State2, formData: FormData): Promise<State2> {
  const imageFile = formData.get('image');
  

  const validatedFields = UpdateCustomerSchema.safeParse({
    customerName: formData.get('name'),
    customerEmail: formData.get('email'),
    customerImage: imageFile,
  });
 
  if (!validatedFields.success) {
    console.log(validatedFields);
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to update Customer.',
    };
  }
  
  const { customerName, customerEmail, customerImage } = validatedFields.data;
  
  try {
    // FIX 4: Secure duplicate check by ignoring the current customer's own ID
    const existingCustomers = await sql`
      SELECT name, email 
      FROM customers 
      WHERE ( name = ${customerName} OR email = ${customerEmail} ) AND id != ${id}
    `;

    if (existingCustomers.length > 0) {
      return {
        errors: {}, 
        message: 'Customer name or email already exist on another record.',
      };
    }

    // A: Query current image URL to use as fallback if no new image is provided
    const currentCustomer = await sql`
      SELECT image_url FROM customers WHERE id = ${id}
    `;
    if (currentCustomer.length === 0) {
      return { errors: {}, message: 'Customer not found.' };
    }
    let dbImagePath = currentCustomer[0].image_url;

    // FIX 2: Only write to disk if a brand new file was actually selected
    if (customerImage && customerImage.size > 0) {
      const uniqueFilename = `${Date.now()}-${customerImage.name}`;
      const physicalPath = path.join(process.cwd(), 'public', 'customers', uniqueFilename);
      dbImagePath = `/customers/${uniqueFilename}`;

      const arrayBuffer = await customerImage.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await fs.writeFile(physicalPath, buffer);
    }

    // Execute update statement
    await sql`
      UPDATE customers
      SET name = ${customerName}, email = ${customerEmail}, image_url = ${dbImagePath}
      WHERE id = ${id}
    `;
  } catch (error) {
    console.error(error);
    // FIX 3: Added missing errors property to match State2 signature
    return {
      errors: {},
      message: 'Database Error: Failed to Update Customer.',
    };
  }
  
  revalidatePath('/dashboard/customers');
  redirect('/dashboard/customers');
  
  return { errors: {}, message: null };
}


export async function deleteInvoice(id: string) {
  // throw new Error('Failed to Delete Invoice');
  await sql`DELETE FROM invoices WHERE id = ${id}`;
  revalidatePath('/dashboard/invoices');
}

export async function deleteCustomer(id: string) {
  // throw new Error('Failed to Delete Customer');
  await sql`DELETE FROM customers WHERE id = ${id}`;
  revalidatePath('/dashboard/customers');
}

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn('credentials', formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}