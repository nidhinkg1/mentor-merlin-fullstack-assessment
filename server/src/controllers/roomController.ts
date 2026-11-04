import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { RoomType } from '../models/RoomType.js';
import { Reservation } from '../models/Reservation.js';
import { BadRequestError, ConflictError, NotFoundError } from '../errors/AppError.js';

const ALLOWED_SORT_FIELDS = ['name', 'capacity', 'pricePerNight', 'totalInventory', 'createdAt'] as const;
type AllowedSortField = typeof ALLOWED_SORT_FIELDS[number];

export const getRooms = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    // By default, public/guest visitors only see active room types
    const isStaffOrAdmin = req.user && (req.user.role === 'staff' || req.user.role === 'admin');

    if (req.query.isActive !== undefined) {
      if (isStaffOrAdmin) {
        filter['isActive'] = req.query.isActive === 'true';
      } else {
        filter['isActive'] = true;
      }
    } else if (!isStaffOrAdmin) {
      filter['isActive'] = true;
    }

    // Optional text search
    if (typeof req.query.search === 'string' && req.query.search.trim().length > 0) {
      const searchRegex = new RegExp(req.query.search.trim(), 'i');
      filter['$or'] = [{ name: searchRegex }, { description: searchRegex }];
    }

    // Sorting with whitelist validation
    const sortBy = (ALLOWED_SORT_FIELDS.includes(req.query.sortBy as AllowedSortField)
      ? req.query.sortBy
      : 'createdAt') as string;
    const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;
    const sortOption: Record<string, 1 | -1> = { [sortBy]: sortOrder };

    const [rooms, total] = await Promise.all([
      RoomType.find(filter).sort(sortOption).skip(skip).limit(limit),
      RoomType.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: rooms,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getRoomById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id || !Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid room type ID format');
    }

    const room = await RoomType.findById(id);
    if (!room) {
      throw new NotFoundError('Room type not found');
    }

    const isStaffOrAdmin = req.user && (req.user.role === 'staff' || req.user.role === 'admin');
    if (!room.isActive && !isStaffOrAdmin) {
      throw new NotFoundError('Room type not found');
    }

    res.status(200).json({
      success: true,
      data: room,
    });
  } catch (error) {
    next(error);
  }
};

export const createRoom = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, description, capacity, pricePerNight, totalInventory, facilities, isActive, imageUrl } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      throw new BadRequestError('Room type name is required and must be at least 2 characters');
    }

    if (!description || typeof description !== 'string' || description.trim().length < 5) {
      throw new BadRequestError('Description is required and must be at least 5 characters');
    }

    const capNum = Number(capacity);
    if (isNaN(capNum) || capNum < 1 || !Number.isInteger(capNum)) {
      throw new BadRequestError('Capacity must be a positive integer of at least 1 guest');
    }

    const priceNum = Number(pricePerNight);
    if (isNaN(priceNum) || priceNum <= 0) {
      throw new BadRequestError('Price per night must be a positive number greater than 0');
    }

    const invNum = Number(totalInventory);
    if (isNaN(invNum) || invNum < 0 || !Number.isInteger(invNum)) {
      throw new BadRequestError('Total inventory must be a non-negative integer');
    }

    const existing = await RoomType.findOne({ name: name.trim() });
    if (existing) {
      throw new ConflictError('A room type with this name already exists');
    }

    const room = await RoomType.create({
      name: name.trim(),
      description: description.trim(),
      capacity: capNum,
      pricePerNight: priceNum,
      totalInventory: invNum,
      facilities: Array.isArray(facilities) ? facilities.map(f => String(f).trim()).filter(Boolean) : [],
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      imageUrl: typeof imageUrl === 'string' ? imageUrl.trim() : '',
    });

    res.status(201).json({
      success: true,
      message: 'Room type created successfully',
      data: room,
    });
  } catch (error) {
    next(error);
  }
};

export const updateRoom = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id || !Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid room type ID format');
    }

    const room = await RoomType.findById(id);
    if (!room) {
      throw new NotFoundError('Room type not found');
    }

    const { name, description, capacity, pricePerNight, totalInventory, facilities, isActive, imageUrl } = req.body;

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 2) {
        throw new BadRequestError('Room type name must be at least 2 characters');
      }
      const existing = await RoomType.findOne({ name: name.trim(), _id: { $ne: id } });
      if (existing) {
        throw new ConflictError('Another room type with this name already exists');
      }
      room.name = name.trim();
    }

    if (description !== undefined) {
      if (typeof description !== 'string' || description.trim().length < 5) {
        throw new BadRequestError('Description must be at least 5 characters');
      }
      room.description = description.trim();
    }

    if (capacity !== undefined) {
      const capNum = Number(capacity);
      if (isNaN(capNum) || capNum < 1 || !Number.isInteger(capNum)) {
        throw new BadRequestError('Capacity must be a positive integer of at least 1 guest');
      }
      room.capacity = capNum;
    }

    if (pricePerNight !== undefined) {
      const priceNum = Number(pricePerNight);
      if (isNaN(priceNum) || priceNum <= 0) {
        throw new BadRequestError('Price per night must be a positive number greater than 0');
      }
      room.pricePerNight = priceNum;
    }

    if (totalInventory !== undefined) {
      const invNum = Number(totalInventory);
      if (isNaN(invNum) || invNum < 0 || !Number.isInteger(invNum)) {
        throw new BadRequestError('Total inventory must be a non-negative integer');
      }
      room.totalInventory = invNum;
    }

    if (facilities !== undefined) {
      room.facilities = Array.isArray(facilities) ? facilities.map(f => String(f).trim()).filter(Boolean) : [];
    }

    if (isActive !== undefined) {
      room.isActive = Boolean(isActive);
    }

    if (imageUrl !== undefined) {
      room.imageUrl = typeof imageUrl === 'string' ? imageUrl.trim() : '';
    }

    await room.save();

    res.status(200).json({
      success: true,
      message: 'Room type updated successfully',
      data: room,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteOrDeactivateRoom = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id || !Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid room type ID format');
    }

    const room = await RoomType.findById(id);
    if (!room) {
      throw new NotFoundError('Room type not found');
    }

    // Check if any reservation history is linked to this room type
    const hasReservations = await Reservation.exists({ roomTypeId: id });

    if (hasReservations || req.query.force !== 'true') {
      // Soft-deactivation to preserve historical booking records & financial audit trails
      room.isActive = false;
      await room.save();

      res.status(200).json({
        success: true,
        message: 'Room type has associated history; deactivated successfully to preserve records',
        data: room,
      });
      return;
    }

    // If completely unreferenced and explicitly forced, remove document
    await RoomType.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Room type deleted permanently',
    });
  } catch (error) {
    next(error);
  }
};

