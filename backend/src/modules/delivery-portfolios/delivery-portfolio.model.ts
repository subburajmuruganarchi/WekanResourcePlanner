import { Document, Schema, Types, model } from 'mongoose';

export interface IDeliveryPortfolio extends Document {
    name: string;
    description?: string;
    project_ids: Types.ObjectId[];
    manager_ids: Types.ObjectId[];
    is_active: boolean;
    created_at?: Date;
    updated_at?: Date;
}

const DeliveryPortfolioSchema = new Schema<IDeliveryPortfolio>(
    {
        name: { type: String, required: true, trim: true, index: true },
        description: { type: String, trim: true },
        project_ids: [{ type: Schema.Types.ObjectId, ref: 'Project', index: true }],
        manager_ids: [{ type: Schema.Types.ObjectId, ref: 'Employee', index: true }],
        is_active: { type: Boolean, default: true, index: true },
    },
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
        collection: 'delivery_portfolios',
    }
);

export const DeliveryPortfolio = model<IDeliveryPortfolio>(
    'DeliveryPortfolio',
    DeliveryPortfolioSchema
);
