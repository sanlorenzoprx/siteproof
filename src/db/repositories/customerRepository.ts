import { BaseRepository } from './baseRepository';
import { Customer, baseSyncFields, baseTimestampFields, newId } from '../schema';

export type CreateCustomerInput = Omit<Customer, 'customer_id' | 'created_at' | 'updated_at' | 'deleted_at' | 'sync_state' | 'local_version' | 'remote_version' | 'last_synced_at'>;

class CustomerRepository extends BaseRepository<Customer> {
  constructor() {
    super('customers', 'customer_id', 'customer');
  }

  async createCustomer(input: CreateCustomerInput): Promise<Customer> {
    return this.create({
      ...input,
      customer_id: newId(),
      ...baseTimestampFields(),
      ...baseSyncFields(),
    });
  }

  getByCompany(companyId: string): Promise<Customer[]> {
    return this.getByIndex('company_id', companyId);
  }
}

export const customerRepository = new CustomerRepository();
