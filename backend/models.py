from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = 'users'
    
    id = Column(String, primary_key=True, index=True)  # Firebase UID
    email = Column(String, unique=True, index=True)
    
    progress = relationship("UserProgress", back_populates="user", uselist=False)
    lessons = relationship("LessonCompletion", back_populates="user")

class UserProgress(Base):
    __tablename__ = 'user_progress'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey('users.id'))
    
    total_xp = Column(Integer, default=0)
    level = Column(Integer, default=1)
    signal_bonus_credits = Column(Integer, default=0)
    
    # Replaces the manual JSON download by storing it directly on the server
    game_state_passport = Column(JSON, default={})
    
    user = relationship("User", back_populates="progress")

class LessonCompletion(Base):
    __tablename__ = 'lesson_completions'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey('users.id'))
    module_id = Column(String)  # e.g., "nexus_defense_1"
    score = Column(Integer)
    passed = Column(Boolean, default=False)
    
    user = relationship("User", back_populates="lessons")
