import { createBdd } from 'playwright-bdd';
import * as dotenv from 'dotenv';

dotenv.config();

export const { Given, When, Then, Before, After } = createBdd();